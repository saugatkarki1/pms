import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/auth'
import type { User as SupabaseAuthUser, AuthChangeEvent, Session } from '@supabase/supabase-js'

/**
 * Log Supabase errors with REAL details — never logs {}
 */
function logSupabaseError(context: string, error: unknown) {
  if (!error) return
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    console.error(`[useUser] ${context}:`, JSON.stringify({
      message: e.message ?? 'no message',
      code: e.code ?? 'no code',
      details: e.details ?? '',
      hint: e.hint ?? '',
      status: e.status ?? '',
    }, null, 2))
  } else {
    console.error(`[useUser] ${context}:`, String(error))
  }
}

/**
 * Check if error is a permission denied error (RLS block)
 */
function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  return e.code === '42501' || String(e.message).includes('permission denied')
}

/**
 * Fetch the user profile from public.users
 * Uses .maybeSingle() — returns null if no row, does NOT throw on 0 rows
 */
async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  authUserId: string
): Promise<{ profile: User | null; error: unknown | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle()

  if (error) {
    logSupabaseError('Profile fetch failed', error)
    return { profile: null, error }
  }

  return { profile: data as User | null, error: null }
}

/**
 * Create user profile via SECURITY DEFINER RPC (bypasses RLS)
 */
async function createProfileViaRPC(
  supabase: ReturnType<typeof createClient>,
  authUser: SupabaseAuthUser
): Promise<User | null> {
  const meta = authUser.user_metadata || {}
  const fullName = meta.full_name || authUser.email?.split('@')[0] || 'User'

  console.log('[useUser] Calling handle_new_signup RPC for:', authUser.email)

  const { data, error } = await supabase.rpc('handle_new_signup', {
    p_user_id: authUser.id,
    p_email: authUser.email!,
    p_full_name: fullName,
  })

  if (error) {
    logSupabaseError('RPC handle_new_signup failed', error)
    return null
  }

  if (!data) {
    console.error('[useUser] RPC returned null data — function may not be deployed correctly')
    return null
  }

  console.log('[useUser] Profile created successfully for:', authUser.email)
  return data as User
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Guards: prevent infinite loops and duplicate creation
  const creatingProfile = useRef(false)
  const didAttemptCreate = useRef(false)

  /**
   * Core flow:
   * 1. Get session FIRST (local, no network request) — check if JWT exists
   * 2. If no session, getUser() as fallback to trigger refresh
   * 3. Fetch profile from public.users (using .maybeSingle)
   * 4. If profile is null & no error → user doesn't exist → create via RPC (ONCE)
   * 5. If profile is null & error is 42501 → RLS/auth issue → stop, don't create
   * 6. If profile exists → set user state
   */
  const loadUser = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    try {
      // Step 1: Get session (local check — fast, no network)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        logSupabaseError('auth.getSession() failed', sessionError)
      }

      let currentUser: SupabaseAuthUser | null = session?.user ?? null

      if (session) {
        console.log('[useUser] Auth session found | role:', session.user.role ?? 'unknown', '| token exists:', !!session.access_token)
      } else {
        // Step 2: No local session — try getUser() to trigger token refresh
        console.log('[useUser] No local session, calling getUser() to refresh...')
        const { data: { user: refreshedUser }, error: authError } = await supabase.auth.getUser()

        if (authError) {
          logSupabaseError('auth.getUser() failed', authError)
          setAuthUser(null)
          setUser(null)
          setLoading(false)
          return
        }

        if (!refreshedUser) {
          console.log('[useUser] No authenticated user found')
          setAuthUser(null)
          setUser(null)
          setLoading(false)
          return
        }

        currentUser = refreshedUser
      }

      if (!currentUser) {
        console.log('[useUser] No authenticated user after session check')
        setAuthUser(null)
        setUser(null)
        setLoading(false)
        return
      }

      setAuthUser(currentUser)
      console.log('[useUser] Auth user:', currentUser.email, '| id:', currentUser.id)

      // Step 3: Fetch profile with .maybeSingle()
      const { profile, error: fetchErr } = await fetchProfile(supabase, currentUser.id)

      if (profile) {
        // Step 6: Profile found — done
        console.log('[useUser] Profile loaded:', profile.email, '| role:', profile.role, '| tenant:', profile.tenant_id)
        setUser(profile)
        didAttemptCreate.current = false
        setLoading(false)
        return
      }

      if (fetchErr) {
        // Step 5: Real error — check if it's permission denied
        if (isPermissionError(fetchErr)) {
          console.error('[useUser] ❌ PERMISSION DENIED (42501) — auth.uid() is likely NULL.')
          console.error('[useUser] This means the request is running as anon role, not authenticated.')
          console.error('[useUser] Fix: Run fix_rls_final.sql in Supabase SQL Editor (GRANT + policies)')
        } else {
          console.error('[useUser] Cannot fetch profile due to error — not attempting creation')
        }
        setError(new Error('Permission denied: unable to fetch user profile'))
        setUser(null)
        setLoading(false)
        return
      }

      // Step 4: Profile is null, no error → user row doesn't exist yet
      // Create ONCE via RPC
      if (creatingProfile.current || didAttemptCreate.current) {
        console.warn('[useUser] Skipping creation — already attempted or in progress')
        setUser(null)
        setLoading(false)
        return
      }

      creatingProfile.current = true
      didAttemptCreate.current = true

      const newUser = await createProfileViaRPC(supabase, currentUser)
      creatingProfile.current = false

      if (newUser) {
        setUser(newUser)
      } else {
        // RPC failed — try one more fetch in case it was created by the callback route
        console.log('[useUser] RPC returned null, trying one more fetch...')
        const { profile: retryProfile } = await fetchProfile(supabase, currentUser.id)
        if (retryProfile) {
          console.log('[useUser] Found profile on retry')
          setUser(retryProfile)
        } else {
          console.error('[useUser] Profile creation and retry both failed. Check RLS policies and handle_new_signup function.')
          setUser(null)
        }
      }
    } catch (err) {
      logSupabaseError('Unexpected error in loadUser', err)
      setError(err instanceof Error ? err : new Error('Failed to load user'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Initial load
    loadUser(supabase)

    // Auth state listener — only refetch, NEVER auto-create here
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      console.log('[useUser] Auth state changed:', _event, '| session:', !!session)

      if (session?.user) {
        setAuthUser(session.user)

        // Just fetch — if profile was created by callback or initial load, it will be found
        const { profile, error: fetchErr } = await fetchProfile(supabase, session.user.id)
        if (profile) {
          setUser(profile)
        } else if (fetchErr && isPermissionError(fetchErr)) {
          console.error('[useUser] ❌ Permission denied in onAuthStateChange — RLS issue persists')
        }
        // Do NOT create here — let loadUser handle it once
      } else {
        setAuthUser(null)
        setUser(null)
        didAttemptCreate.current = false
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [loadUser])

  return { user, authUser, loading, error }
}
