'use client'

import { useUser } from '@/hooks/useUser'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Settings, Shield, Key, Code } from 'lucide-react'
import '@/app/dashboard.css'

export default function SettingsPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  })

  const supabase = createClient()

  const handleUpdateProfile = async () => {
    if (!user) return
    setSaving(true)
    setSuccessMessage('')
    try {
      if (formData.email !== user.email) {
        await supabase.auth.updateUser({ email: formData.email })
      }
      const { error } = await supabase
        .from('users')
        .update({ full_name: formData.full_name })
        .eq('id', user.id)
      if (error) throw error
      setSuccessMessage('Profile updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.target as HTMLFormElement
    const newPassword = (formElement.querySelector('input[name="new-password"]') as HTMLInputElement).value
    const confirmPassword = (formElement.querySelector('input[name="confirm-password"]') as HTMLInputElement).value

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccessMessage('Password updated successfully')
      formElement.reset()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Failed to update password:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Settings</h1>
          <p className="dash-page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="dash-tab-bar">
        <button className={`dash-tab-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          Profile
        </button>
        <button className={`dash-tab-item ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
          Password
        </button>
        <button className={`dash-tab-item ${activeTab === 'tenant' ? 'active' : ''}`} onClick={() => setActiveTab('tenant')}>
          Tenant Info
        </button>
        <button className={`dash-tab-item ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
          API
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-section-title">Profile Information</div>
            <div className="dash-section-subtitle">Update your personal information</div>
          </div>
          <div className="dash-section-body" style={{ maxWidth: 520 }}>
            {successMessage && (
              <div className="dash-badge dash-badge-success" style={{ display: 'block', padding: '10px 16px', marginBottom: 16, fontSize: 13, borderRadius: 12 }}>
                {successMessage}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="dash-form-field">
                <label className="dash-form-label">Full Name</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="dash-form-field">
                <label className="dash-form-label">Email Address</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <button className="dash-btn dash-btn-accent" onClick={handleUpdateProfile} disabled={saving} style={{ width: 'fit-content' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-section-title">Change Password</div>
            <div className="dash-section-subtitle">Update your password to keep your account secure</div>
          </div>
          <div className="dash-section-body" style={{ maxWidth: 520 }}>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {successMessage && (
                <div className="dash-badge dash-badge-success" style={{ display: 'block', padding: '10px 16px', fontSize: 13, borderRadius: 12 }}>
                  {successMessage}
                </div>
              )}
              <div className="dash-form-field">
                <label className="dash-form-label">New Password</label>
                <Input name="new-password" type="password" placeholder="Enter new password" required />
              </div>
              <div className="dash-form-field">
                <label className="dash-form-label">Confirm Password</label>
                <Input name="confirm-password" type="password" placeholder="Confirm new password" required />
              </div>
              <button className="dash-btn dash-btn-accent" type="submit" disabled={saving} style={{ width: 'fit-content' }}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Info Tab */}
      {activeTab === 'tenant' && (
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-section-title">Tenant Information</div>
            <div className="dash-section-subtitle">Your organization details</div>
          </div>
          <div className="dash-section-body" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="dash-form-field">
                <label className="dash-form-label">Tenant ID</label>
                <Input value={user?.tenant_id} readOnly disabled />
              </div>
              <div className="dash-form-field">
                <label className="dash-form-label">Your Role</label>
                <Input value={user?.role || ''} readOnly disabled style={{ textTransform: 'capitalize' }} />
              </div>
              <div className="dash-form-field">
                <label className="dash-form-label">Account Status</label>
                <Input value={user?.is_active ? 'Active' : 'Inactive'} readOnly disabled />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="dash-section-card">
          <div className="dash-section-header">
            <div className="dash-section-title">API Integration</div>
            <div className="dash-section-subtitle">Integration endpoints for external systems</div>
          </div>
          <div className="dash-section-body" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="dash-form-label" style={{ marginBottom: 6, display: 'block' }}>Biometric Attendance API</label>
                <p style={{ fontSize: 12, color: 'var(--dash-text-muted)', marginBottom: 8 }}>
                  Use this endpoint to record attendance from biometric devices
                </p>
                <div className="dash-card" style={{ padding: '12px 16px', background: 'var(--dash-surface-alt)', fontFamily: 'monospace', fontSize: 13 }}>
                  POST /api/biometric/attendance
                </div>
              </div>

              <div>
                <label className="dash-form-label" style={{ marginBottom: 8, display: 'block' }}>Required Parameters</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['tenant_id — Your tenant ID', 'employee_id — Employee identification', 'timestamp — ISO 8601 timestamp', 'event_type — check_in or check_out'].map((param) => (
                    <div key={param} className="dash-card" style={{ padding: '10px 14px', fontSize: 12 }}>
                      <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{param.split(' — ')[0]}</code>
                      <span style={{ color: 'var(--dash-text-muted)' }}> — {param.split(' — ')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="dash-form-label" style={{ marginBottom: 8, display: 'block' }}>Example Request</label>
                <div className="dash-card" style={{ padding: '14px 16px', background: 'var(--dash-surface-alt)', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {`{
  "tenant_id": "${user?.tenant_id}",
  "employee_id": "EMP001",
  "timestamp": "2024-03-02T09:30:00Z",
  "event_type": "check_in",
  "device_name": "Device-1"
}`}
                </div>
              </div>

              <div className="dash-alert-item" style={{ background: 'var(--dash-info-soft)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <span className="dash-alert-dot" style={{ background: 'var(--dash-info)' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--dash-text-primary)', marginBottom: 2 }}>Documentation</div>
                  <div style={{ fontSize: 12, color: 'var(--dash-text-secondary)' }}>
                    For more information about the Biometric API, visit: <code style={{ fontFamily: 'monospace' }}>/api/biometric/attendance</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
