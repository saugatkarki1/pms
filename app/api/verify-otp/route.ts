import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json()

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
        }

        // Verify the requesting user is authenticated
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Hash the submitted OTP
        const otpHash = crypto.createHash('sha256').update(otp.toString()).digest('hex')

        // Use service-role client to read from otp_codes table
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Look up the most recent unused, non-expired OTP for this email
        const now = new Date().toISOString()
        const { data: otpRecord, error: lookupError } = await adminSupabase
            .from('otp_codes')
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .gte('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (lookupError || !otpRecord) {
            return NextResponse.json({
                error: 'Invalid or expired OTP. Please request a new one.',
                code: 'OTP_EXPIRED',
            }, { status: 400 })
        }

        // Compare hashes
        if (otpRecord.otp_hash !== otpHash) {
            return NextResponse.json({
                error: 'Incorrect OTP. Please try again.',
                code: 'OTP_INVALID',
            }, { status: 400 })
        }

        // Mark OTP as used
        await adminSupabase
            .from('otp_codes')
            .update({ used: true })
            .eq('id', otpRecord.id)

        // Set a secure httpOnly cookie to mark 2FA as verified
        // Cookie value: user_id:timestamp (valid for 24 hours)
        const timestamp = Date.now()
        const cookieValue = `${authUser.id}:${timestamp}`

        const cookieStore = await cookies()
        cookieStore.set('2fa_verified', cookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60, // 24 hours
        })

        return NextResponse.json({
            success: true,
            message: '2FA verification successful',
        })

    } catch (error) {
        console.error('[verify-otp] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
