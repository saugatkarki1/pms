import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const { email, password, fullName, tenantId } = await request.json()

        if (!email || !password || !fullName || !tenantId) {
            return NextResponse.json(
                { error: 'Email, password, full name, and tenant ID are required' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Verify requesting user is an owner
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: requestingUser } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', authUser.id)
            .single()

        if (!requestingUser || requestingUser.role !== 'owner') {
            return NextResponse.json(
                { error: 'Only owners can create admin accounts' },
                { status: 403 }
            )
        }

        // Use service-role client for admin operations (server-side config)
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        // Check if email is already in use
        const { data: existingUser } = await adminSupabase
            .from('users')
            .select('id, role')
            .eq('email', email)
            .single()

        if (existingUser) {
            if (existingUser.role === 'admin') {
                return NextResponse.json(
                    { error: 'This email is already an admin account' },
                    { status: 409 }
                )
            }
            // Update existing user to admin
            const { error: updateError } = await adminSupabase
                .from('users')
                .update({ role: 'admin', is_active: true, onboarding_completed: true })
                .eq('email', email)

            if (updateError) {
                console.error('[create-admin] Update error:', updateError.message)
                return NextResponse.json(
                    { error: updateError.message || 'Failed to promote user to admin' },
                    { status: 500 }
                )
            }

            return NextResponse.json({ success: true, message: 'User promoted to admin' })
        }

        // Create auth user via Supabase Admin API
        let authUserId: string

        const { data: newAuthUser, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'admin',
            },
        })

        if (authError) {
            // If user already exists in auth but not in users table (orphaned from previous failed attempt)
            if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
                console.log('[create-admin] Auth user exists, checking for orphaned account...')
                // List users by email to find the existing auth user
                const { data: listData } = await adminSupabase.auth.admin.listUsers()
                const existingAuthUser = listData?.users?.find(u => u.email === email)

                if (existingAuthUser) {
                    // Delete any orphaned user profile in users table first
                    await adminSupabase
                        .from('users')
                        .delete()
                        .eq('id', existingAuthUser.id)

                    // Delete the orphaned auth user and recreate
                    await adminSupabase.auth.admin.deleteUser(existingAuthUser.id)

                    const { data: retryUser, error: retryError } = await adminSupabase.auth.admin.createUser({
                        email,
                        password,
                        email_confirm: true,
                        user_metadata: {
                            full_name: fullName,
                            role: 'admin',
                        },
                    })

                    if (retryError || !retryUser) {
                        console.error('[create-admin] Retry auth error:', retryError?.message)
                        return NextResponse.json(
                            { error: retryError?.message || 'Failed to create auth user after cleanup' },
                            { status: 400 }
                        )
                    }
                    authUserId = retryUser.user.id
                } else {
                    return NextResponse.json(
                        { error: authError.message || 'Failed to create auth user' },
                        { status: 400 }
                    )
                }
            } else {
                console.error('[create-admin] Auth error:', authError.message)
                return NextResponse.json(
                    { error: authError.message || 'Failed to create auth user' },
                    { status: 400 }
                )
            }
        } else {
            authUserId = newAuthUser.user.id
        }

        // Clean up any orphaned user profile with the same email before inserting
        await adminSupabase
            .from('users')
            .delete()
            .eq('email', email)

        // Create user profile in users table using owner's tenant_id
        const { error: profileError } = await adminSupabase
            .from('users')
            .insert({
                id: authUserId,
                tenant_id: requestingUser.tenant_id,
                email,
                full_name: fullName,
                role: 'admin',
                is_active: true,
                onboarding_completed: true,
                created_at: new Date().toISOString(),
            })

        if (profileError) {
            console.error('[create-admin] Profile error:', profileError.message, profileError.details, profileError.hint)
            // Cleanup: delete the auth user since profile creation failed
            await adminSupabase.auth.admin.deleteUser(authUserId)
            return NextResponse.json(
                { error: profileError.message || 'Failed to create admin profile' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Admin account created successfully',
        })

    } catch (error) {
        console.error('[create-admin] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

