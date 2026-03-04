import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/auth'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'

async function createProfileFromAuth(
  supabase: ReturnType<typeof createClient>,
  authUser: SupabaseAuthUser
): Promise<User | null> {
  try {
    const meta = authUser.user_metadata || {}
    const fullName = meta.full_name || authUser.email?.split('@')[0] || 'User'

    // SECURITY: Always force worker role for auto-created profiles
    // Owner and Admin accounts must be created via proper channels only
    const role = 'worker'

    // Create a tenant for this user
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: fullName,
        email: authUser.email,
      })
      .select('id')
      .single()

    if (tenantError) {
      console.error('[useUser] Failed to create tenant:', tenantError.message)
      // Try to find existing tenant by email
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('email', authUser.email!)
        .single()

      if (!existingTenant) return null

      // Create user with existing tenant — always as inactive worker
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          tenant_id: existingTenant.id,
          email: authUser.email!,
          full_name: fullName,
          role: role,
          is_active: false,
          onboarding_completed: false,
        })
        .select('*')
        .single()

      if (userError) {
        console.error('[useUser] Failed to create user profile:', userError.message)
        return null
      }
      return newUser as User
    }

    // Create user with new tenant — always as inactive worker
    const { data: newUser, error: userError } = await supabase
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
      .select('*')
      .single()

    if (userError) {
      console.error('[useUser] Failed to create user profile:', userError.message)
      return null
    }

    console.log('[useUser] Auto-created profile for:', authUser.email)
    return newUser as User
  } catch (err) {
    console.error('[useUser] Error in createProfileFromAuth:', err)
    return null
  }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const creatingProfile = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      try {
        const {
          data: { user: authUserData },
        } = await supabase.auth.getUser()

        if (!authUserData) {
          setAuthUser(null)
          setUser(null)
          setLoading(false)
          return
        }

        setAuthUser(authUserData)

        // Try to fetch existing profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserData.id)
          .single()

        if (userError || !userData) {
          // Profile not found — try to auto-create it
          if (!creatingProfile.current) {
            creatingProfile.current = true
            console.log('[useUser] Profile not found, auto-creating...')
            const newUser = await createProfileFromAuth(supabase, authUserData)
            creatingProfile.current = false
            if (newUser) {
              setUser(newUser)
            } else {
              setUser(null)
            }
          }
        } else {
          setUser(userData as User)
        }
      } catch (err) {
        console.error('[useUser] Unexpected error:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUser(session.user)
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userData) {
          setUser(userData as User)
        } else if (!creatingProfile.current) {
          // Auto-create on auth state change too
          creatingProfile.current = true
          const newUser = await createProfileFromAuth(supabase, session.user)
          creatingProfile.current = false
          if (newUser) {
            setUser(newUser)
          }
        }
      } else {
        setAuthUser(null)
        setUser(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return { user, authUser, loading, error }
}
