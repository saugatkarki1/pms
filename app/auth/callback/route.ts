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
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', authUser.id)
                    .single()

                if (!existingUser) {
                    // Profile doesn't exist — create tenant + user
                    const meta = authUser.user_metadata || {}
                    const fullName = meta.full_name || authUser.email?.split('@')[0] || 'User'

                    // SECURITY: Always force worker role for auto-created profiles
                    const role = 'worker'

                    const { data: tenant } = await supabase
                        .from('tenants')
                        .insert({ name: fullName, email: authUser.email })
                        .select('id')
                        .single()

                    if (tenant) {
                        await supabase
                            .from('users')
                            .insert({
                                id: authUser.id,
                                tenant_id: tenant.id,
                                email: authUser.email!,
                                full_name: fullName,
                                role: role,
                                is_active: false,
                                onboarding_completed: false,
                            })
                    }
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/error?error=auth_callback_error`)
}
