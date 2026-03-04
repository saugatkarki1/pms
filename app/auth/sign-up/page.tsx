'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { LanguageToggle } from '@/components/LanguageToggle'
import '../auth.css'

export default function Page() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!fullName.trim()) {
      setError('Full name is required')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            role: 'worker',
          },
        },
      })
      if (error) throw error
      router.push('/auth/login?signup=success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
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
            <div key={i} className={`auth-brand-dot ${[3, 7, 10, 13, 16, 19, 22].includes(i) ? 'active' : ''}`} />
          ))}
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <div className="auth-form-title">{t('auth.signup.title')}</div>
          <div className="auth-form-subtitle">{t('auth.signup.subtitle')}</div>

          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="fullName">{t('auth.fullName')}</label>
              <input
                id="fullName"
                type="text"
                className="auth-input"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

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

            <div className="auth-field-row">
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
              <div className="auth-field">
                <label className="auth-label" htmlFor="repeat-password">{t('auth.repeatPassword')}</label>
                <input
                  id="repeat-password"
                  type="password"
                  className="auth-input"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
              {isLoading ? t('auth.creatingAccount') : t('auth.signup')}
            </button>
          </form>

          <div className="auth-link-row">
            {t('auth.hasAccount')}{' '}
            <Link href="/auth/login" className="auth-link">
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
