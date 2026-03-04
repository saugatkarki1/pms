import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Use service-role client for all DB operations (bypasses RLS)
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Look up the TARGET user by the email from the login form
        // This ensures we always find the user who is trying to log in,
        // not whoever's session might still be active (e.g., the owner)
        const { data: userData } = await adminSupabase
            .from('users')
            .select('id, role, full_name, email')
            .eq('email', email)
            .single()

        if (!userData || (userData.role !== 'owner' && userData.role !== 'admin')) {
            return NextResponse.json({ error: 'Only Owner and Admin require 2FA' }, { status: 403 })
        }

        // Generate secure 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString()

        // Hash OTP before storing
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex')

        // Invalidate all previous unused OTPs for this email
        await adminSupabase
            .from('otp_codes')
            .update({ used: true })
            .eq('email', email)
            .eq('used', false)

        // Store new OTP with 3-minute expiry
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString()

        const { error: insertError } = await adminSupabase
            .from('otp_codes')
            .insert({
                user_id: userData.id,
                email,
                otp_hash: otpHash,
                expires_at: expiresAt,
                used: false,
            })

        if (insertError) {
            console.error('[send-otp] Failed to store OTP:', insertError.message)
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
        }

        // Determine which EmailJS service/template to use based on role
        const serviceId = userData.role === 'owner'
            ? process.env.EMAILJS_OWNER_SERVICE_ID
            : process.env.EMAILJS_ADMIN_SERVICE_ID

        const templateId = userData.role === 'owner'
            ? process.env.EMAILJS_OWNER_TEMPLATE_ID
            : process.env.EMAILJS_ADMIN_TEMPLATE_ID

        const publicKey = process.env.EMAILJS_PUBLIC_KEY
        const privateKey = process.env.EMAILJS_PRIVATE_KEY

        // Send OTP via EmailJS REST API (accessToken required for server-side calls)
        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey,
                template_params: {
                    to_email: email,
                    otp_code: otp,
                    user_name: userData.full_name || email.split('@')[0],
                },
            }),
        })

        if (!emailResponse.ok) {
            const errText = await emailResponse.text()
            console.error('[send-otp] EmailJS error:', errText)
            return NextResponse.json({ error: `Failed to send OTP email: ${errText}` }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully',
            expiresIn: 180, // 3 minutes in seconds
        })

    } catch (error) {
        console.error('[send-otp] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
