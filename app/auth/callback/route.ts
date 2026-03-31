import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/protected'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // After exchanging code, check if user profile exists and create if missing
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
                try {
                    const { data: existingUser, error: checkError } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', authUser.id)
                        .maybeSingle()

                    if (checkError) {
                        console.error('[auth/callback] Error checking user profile:', {
                            message: checkError.message,
                            code: checkError.code,
                            details: checkError.details,
                        })
                        // Don't block the redirect — profile creation can happen client-side
                    }

                    if (!existingUser && !checkError) {
                        // Profile doesn't exist — create tenant + user via SECURITY DEFINER function
                        const meta = authUser.user_metadata || {}
                        const fullName = meta.full_name || authUser.email?.split('@')[0] || 'User'

                        const { error: rpcError } = await supabase.rpc('handle_new_signup', {
                            p_user_id: authUser.id,
                            p_email: authUser.email!,
                            p_full_name: fullName,
                        })

                        if (rpcError) {
                            console.error('[auth/callback] handle_new_signup RPC failed:', {
                                message: rpcError.message,
                                code: rpcError.code,
                                details: rpcError.details,
                            })
                        } else {
                            console.log('[auth/callback] Profile created for:', authUser.email)
                        }
                    }
                } catch (err) {
                    console.error('[auth/callback] Unexpected error during profile check/creation:', err)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/error?error=auth_callback_error`)
}
