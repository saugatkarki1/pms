/**
 * Returns the correct Supabase auth redirect URL based on the current environment.
 *
 * - Production (Vercel): uses NEXT_PUBLIC_PROD_SUPABASE_REDIRECT_URL
 * - Development (local): uses NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
 * - Fallback: constructs from window.location.origin
 */
export function getAuthRedirectUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    return (
      process.env.NEXT_PUBLIC_PROD_SUPABASE_REDIRECT_URL ||
      'https://workforcems1.vercel.app/auth/callback'
    )
  }

  return (
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
    'http://localhost:3000/auth/callback'
  )
}
