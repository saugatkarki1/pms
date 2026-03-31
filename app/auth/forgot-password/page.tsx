'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { LanguageToggle } from '@/components/LanguageToggle'
import '../auth.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.replace('/auth/callback', '/auth/reset-password')

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-brand">
        <div className="auth-brand-toggle">
          <LanguageToggle variant="auth" />
        </div>
        <div className="auth-brand-logo">W</div>
        <div className="auth-brand-title">{t('auth.tagline')}</div>
        <div className="auth-brand-desc">{t('auth.taglineDesc')}</div>
        <div className="auth-brand-dots">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={`auth-brand-dot ${[1, 6, 9, 12, 15, 18, 23].includes(i) ? 'active' : ''}`} />
          ))}
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <div className="auth-form-title">Forgot Password</div>
          <div className="auth-form-subtitle">
            Enter your email and we&apos;ll send you a reset link
          </div>

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div className="auth-success" style={{ marginBottom: 20 }}>
                ✅ Password reset link sent! Check your email inbox.
              </div>
              <Link href="/auth/login" className="auth-link">
                ← Back to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleReset}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Email Address</label>
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

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="auth-link-row">
            Remember your password?{' '}
            <Link href="/auth/login" className="auth-link">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
