'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import '../auth.css'

function ErrorContent() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')

  return (
    <div className="auth-container">
      {/* Brand Panel */}
      <div className="auth-brand">
        <div className="auth-brand-logo">W</div>
        <div className="auth-brand-title">Workforce Management System</div>
        <div className="auth-brand-desc">
          Streamline your workforce operations with powerful tools for attendance, payroll, and team management.
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper" style={{ textAlign: 'center' }}>
          <div className="auth-error-icon">
            <AlertTriangle size={28} color="#ef4444" />
          </div>
          <div className="auth-error-title">Something went wrong</div>
          <div className="auth-error-desc">
            An error occurred during authentication. Please try again.
          </div>
          {errorCode && (
            <div className="auth-error-code">
              Error: {errorCode}
            </div>
          )}
          <div style={{ marginTop: 32 }}>
            <Link href="/auth/login" className="auth-btn auth-btn-primary" style={{ display: 'inline-flex', textDecoration: 'none', padding: '0 32px' }}>
              Back to Login
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
      <ErrorContent />
    </Suspense>
  )
}
