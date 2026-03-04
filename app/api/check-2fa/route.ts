import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ verified: false })
        }

        const cookieStore = await cookies()
        const twoFaCookie = cookieStore.get('2fa_verified')

        if (!twoFaCookie?.value) {
            return NextResponse.json({ verified: false })
        }

        // Parse cookie: user_id:timestamp
        const [userId, timestampStr] = twoFaCookie.value.split(':')

        // Verify cookie belongs to the current user
        if (userId !== authUser.id) {
            return NextResponse.json({ verified: false })
        }

        // Check if cookie is still valid (24 hours)
        const timestamp = parseInt(timestampStr, 10)
        const now = Date.now()
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        if (isNaN(timestamp) || now - timestamp > maxAge) {
            return NextResponse.json({ verified: false })
        }

        return NextResponse.json({ verified: true })
    } catch (error) {
        console.error('[check-2fa] Error:', error)
        return NextResponse.json({ verified: false })
    }
}
