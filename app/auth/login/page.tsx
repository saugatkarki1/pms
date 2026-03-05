'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { useLanguage } from '@/lib/i18n'
import { LanguageToggle } from '@/components/LanguageToggle'
import '../auth.css'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSignupSuccess = searchParams.get('signup') === 'success'
  const { t } = useLanguage()

  // OTP/2FA logic has been removed — Owner and Admin now use standard email/password auth

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Fetch user role for routing (2FA check removed — direct redirect for all roles)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Authentication failed')

      const { data: userData } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', authUser.id)
        .single()

      if (!userData) {
        // Profile will be auto-created by useUser hook — redirect to protected
        router.refresh()
        router.push('/protected')
        return
      }

      // Check if worker is inactive
      if (userData.role === 'worker' && !userData.is_active) {
        router.refresh()
        router.push('/protected')
        return
      }

      // All roles (owner, admin, worker) — direct access after password auth
      // (Previously, owner/admin required OTP 2FA here — now removed)
      router.refresh()
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Brand Panel */}
      <div className="auth-brand">
        <div className="auth-brand-toggle">
          <LanguageToggle variant="auth" />
        </div>
        <div className="auth-brand-logo">W</div>
        <div className="auth-brand-title">{t('auth.tagline')}</div>
        <div className="auth-brand-desc">{t('auth.taglineDesc')}</div>
        <div className="auth-brand-dots">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={`auth-brand-dot ${[2, 5, 8, 11, 14, 17, 20].includes(i) ? 'active' : ''}`} />
          ))}
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <div className="auth-form-title">{t('auth.login.title')}</div>
          <div className="auth-form-subtitle">{t('auth.login.subtitle')}</div>

          {isSignupSuccess && (
            <div className="auth-success" style={{ marginBottom: 20 }}>
              {t('auth.signupSuccess')}
            </div>
          )}

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>

          <div className="auth-link-row">
            {t('auth.noAccount')}{' '}
            <Link href="/auth/sign-up" className="auth-link">
              {t('auth.signup')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
