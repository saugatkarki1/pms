import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'worker'
  tenant_id: string
  is_active: boolean
  phone?: string
  approved_by?: string
  approved_at?: string
  onboarding_completed?: boolean
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerClient()

  // Get auth user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Get user details from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userError) {
    console.error('[auth] Failed to fetch user profile:', {
      message: userError.message,
      code: userError.code,
      details: userError.details,
    })
    return null
  }

  if (!userData) {
    console.warn('[auth] No user profile found for auth user:', authUser.id)
    return null
  }

  return userData as User
}

export async function getCurrentTenant() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createServerClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', user.tenant_id)
    .single()

  return tenant
}

export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.role || null
}

export async function isOwnerOrAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'owner' || role === 'admin'
}

export async function logout() {
  const supabase = createBrowserClient()
  await supabase.auth.signOut()
}
