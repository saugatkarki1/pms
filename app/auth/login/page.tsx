'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense, useRef, useEffect } from 'react'
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

  // 2FA state
  const [show2FA, setShow2FA] = useState(false)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [resendTimer])

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

      // Check user role to determine if 2FA is needed
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

      // Owner or Admin — require 2FA
      if (userData.role === 'owner' || userData.role === 'admin') {
        setUserRole(userData.role)
        await sendOTP()
        setShow2FA(true)
        setIsLoading(false)
        return
      }

      // Worker — direct access
      router.refresh()
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  const sendOTP = async () => {
    setOtpSending(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
      setResendTimer(60) // 60 second cooldown
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('')
    if (otp.length !== 6) {
      setOtpError('Please enter all 6 digits')
      return
    }

    setOtpLoading(true)
    setOtpError(null)

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')

      // 2FA successful — redirect to dashboard
      router.refresh()
      router.push('/protected')
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed')
      setOtpDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setOtpLoading(false)
    }
  }

  const handleCancel2FA = async () => {
    // Sign out and go back to login
    const supabase = createClient()
    await supabase.auth.signOut()
    setShow2FA(false)
    setOtpDigits(['', '', '', '', '', ''])
    setOtpError(null)
    setUserRole(null)
  }

  // 2FA Verification Screen
  if (show2FA) {
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
              <div key={i} className={`auth-brand-dot ${[2, 5, 8, 11, 14, 17, 20].includes(i) ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-wrapper" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(129, 140, 248, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 24,
            }}>
              🔐
            </div>
            <div className="auth-form-title" style={{ textAlign: 'center' }}>Two-Factor Authentication</div>
            <div className="auth-form-subtitle" style={{ marginBottom: 8, textAlign: 'center' }}>
              A 6-digit verification code has been sent to
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#6366f1',
              textAlign: 'center',
              marginBottom: 24,
              wordBreak: 'break-all',
            }}>
              {email}
            </div>

            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="auth-input"
                  style={{
                    width: 48,
                    height: 56,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 0,
                    padding: 0,
                    borderRadius: 12,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {otpError && <div className="auth-error" style={{ marginBottom: 16, textAlign: 'left' }}>{otpError}</div>}

            <button
              type="button"
              className="auth-btn auth-btn-primary"
              onClick={handleVerifyOTP}
              disabled={otpLoading || otpDigits.join('').length !== 6}
              style={{ marginBottom: 16 }}
            >
              {otpLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              fontSize: 13,
              marginTop: 4,
            }}>
              <button
                type="button"
                onClick={sendOTP}
                disabled={resendTimer > 0 || otpSending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendTimer > 0 ? '#9ca3af' : '#6366f1',
                  cursor: resendTimer > 0 ? 'default' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                {otpSending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
              <span style={{ color: '#d1d5db' }}>|</span>
              <button
                type="button"
                onClick={handleCancel2FA}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                ← Back to Login
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              fontSize: 11,
              color: '#9ca3af',
              marginTop: 24,
            }}>
              Code expires in 3 minutes • {userRole === 'owner' ? 'Owner' : 'Admin'} verification
            </div>
          </div>
        </div>
      </div>
    )
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
