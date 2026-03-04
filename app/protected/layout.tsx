'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, authUser, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [waitingForProfile, setWaitingForProfile] = useState(false)
  const [checking2FA, setChecking2FA] = useState(false)
  const [is2FAVerified, setIs2FAVerified] = useState(false)

  useEffect(() => {
    if (!loading && !authUser) {
      router.push('/auth/login')
    }
  }, [authUser, loading, router])

  // Give the auto-creation in useUser a moment to complete
  useEffect(() => {
    if (!loading && authUser && !user) {
      setWaitingForProfile(true)
      const timer = setTimeout(() => {
        setWaitingForProfile(false)
      }, 3000) // Wait up to 3s for profile auto-creation
      return () => clearTimeout(timer)
    }
    if (user) {
      setWaitingForProfile(false)
    }
  }, [loading, authUser, user])

  // Check 2FA status for Owner/Admin
  useEffect(() => {
    if (!user) return

    // Only owner and admin need 2FA — workers skip entirely
    if (user.role !== 'owner' && user.role !== 'admin') {
      setIs2FAVerified(true)
      setChecking2FA(false)
      return
    }

    // Owner/Admin: start 2FA check
    setChecking2FA(true)

    const check2FA = async () => {
      try {
        const res = await fetch('/api/check-2fa')
        const data = await res.json()
        setIs2FAVerified(data.verified)
      } catch {
        setIs2FAVerified(false)
      } finally {
        setChecking2FA(false)
      }
    }

    check2FA()
  }, [user])

  // Redirect workers who haven't completed onboarding
  useEffect(() => {
    if (user && user.role === 'worker' && user.is_active && !user.onboarding_completed && pathname !== '/protected/onboarding') {
      router.replace('/protected/onboarding')
    }
  }, [user, pathname, router])

  if (loading || waitingForProfile || checking2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground">
            {waitingForProfile ? 'Setting up your profile...' : checking2FA ? 'Verifying security...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated at all — redirect handled by useEffect above
  if (!authUser) {
    return null
  }

  // Authenticated but auto-creation failed after waiting
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Profile Setup Issue</h2>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t set up your profile automatically. Please try refreshing or contact your administrator.
            Make sure the database migration has been run.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await fetch('/api/clear-2fa', { method: 'POST' })
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Owner/Admin has not completed 2FA — redirect to login
  if ((user.role === 'owner' || user.role === 'admin') && !is2FAVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--dash-bg, #0f0f13)' }}>
        <div className="text-center max-w-md space-y-6" style={{ padding: 40 }}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>2FA Verification Required</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Two-factor authentication is required for {user.role === 'owner' ? 'Owner' : 'Admin'} accounts.
            Please log in again to complete the verification.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await fetch('/api/clear-2fa', { method: 'POST' })
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
              style={{
                padding: '10px 24px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Worker is not yet approved — show pending approval page
  if (user.role === 'worker' && !user.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--dash-bg, #0f0f13)' }}>
        <div className="text-center max-w-md space-y-6" style={{ padding: 40 }}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Account Pending Verification</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            Your account has been created successfully! Please wait until the <strong style={{ color: '#f59e0b' }}>Owner</strong> or <strong style={{ color: '#f59e0b' }}>Admin</strong> verifies
            and approves your account. Once approved, you will be able to access the dashboard.
          </p>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 12,
            fontSize: 13,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}>
            💡 Contact your organization&apos;s owner or admin to speed up the verification process.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await fetch('/api/clear-2fa', { method: 'POST' })
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
              style={{
                padding: '12px 32px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                maxWidth: 260,
              }}
            >
              ← Go Back to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                width: '100%',
                maxWidth: 260,
              }}
            >
              Check Approval Status
            </button>
          </div>
        </div>
      </div>
    )
  }

  // All pages now use DashboardShell internally for consistent UI
  return <>{children}</>
}
