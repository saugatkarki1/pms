'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { LanguageToggle } from '@/components/LanguageToggle'
import '../auth.css'

function ResetForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 2000)
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
        <div className="auth-brand-title">Reset Your Password</div>
        <div className="auth-brand-desc">Enter a new password for your account</div>
        <div className="auth-brand-dots">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={`auth-brand-dot ${[4, 8, 11, 15, 19, 21].includes(i) ? 'active' : ''}`} />
          ))}
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <div className="auth-form-title">Set New Password</div>
          <div className="auth-form-subtitle">
            Choose a strong password for your account
          </div>

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div className="auth-success" style={{ marginBottom: 20 }}>
                ✅ Password updated successfully! Redirecting to login...
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleReset}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="password">New Password</label>
                <input
                  id="password"
                  type="password"
                  className="auth-input"
                  placeholder="Minimum 8 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="auth-input"
                  placeholder="Repeat your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          <div className="auth-link-row">
            <Link href="/auth/login" className="auth-link">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
