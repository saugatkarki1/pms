import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    try {
        const cookieStore = await cookies()
        cookieStore.set('2fa_verified', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0, // Immediately expire
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[clear-2fa] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
