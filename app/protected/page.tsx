'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { useLanguage } from '@/lib/i18n'
import { formatNPR } from '@/lib/currency'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { MiniLineChart, MiniDonutChart, ProgressRing } from '@/components/dashboard/MiniChart'
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Building2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Plus,
  ChevronRight,
  CircleDot,
  Activity,
  UserCheck,
  Briefcase,
  UserPlus,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import '@/app/dashboard.css'

interface PendingWorker {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

interface Department {
  id: string
  name: string
  description: string | null
  worker_count: number
}

export default function OwnerDashboardPage() {
  const { user } = useUser()
  const router = useRouter()
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeShifts: 0,
    monthlyPayroll: 0,
    attendanceRate: 0,
    presentToday: 0,
    pendingPayroll: 0,
  })
  const [loading, setLoading] = useState(true)
  const [pendingWorkers, setPendingWorkers] = useState<PendingWorker[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [adminForm, setAdminForm] = useState({ email: '', password: '', fullName: '' })
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // Role redirect
  useEffect(() => {
    if (user && user.role === 'worker') {
      router.replace('/protected/worker-dashboard')
    } else if (user && user.role === 'admin') {
      router.replace('/protected/admin-dashboard')
    }
  }, [user, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient()
        const today = format(new Date(), 'yyyy-MM-dd')

        const { count: workersCount } = await supabase
          .from('workers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)

        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_date', today)
          .eq('status', 'present')

        const { count: payrollCount } = await supabase
          .from('payroll')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        const total = workersCount || 1
        const present = presentCount || 0
        const rate = total > 0 ? Math.round((present / total) * 100) : 0

        setStats({
          totalWorkers: workersCount || 0,
          activeShifts: Math.max(present, 1),
          monthlyPayroll: 24500,
          attendanceRate: rate,
          presentToday: present,
          pendingPayroll: payrollCount || 0,
        })
      } catch (error) {
        console.error('[OwnerDashboard] Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchStats()
  }, [user])

  // Fetch pending workers
  useEffect(() => {
    const fetchPending = async () => {
      if (!user) return
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('users')
          .select('id, email, full_name, created_at')
          .eq('tenant_id', user.tenant_id)
          .eq('role', 'worker')
          .eq('is_active', false)
          .order('created_at', { ascending: false })

        setPendingWorkers(data || [])
      } catch (error) {
        console.error('[OwnerDashboard] Error fetching pending workers:', error)
      }
    }
    fetchPending()
  }, [user])

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!user) return
      try {
        const supabase = createClient()
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .order('name')

        if (depts) {
          // Get worker counts per department
          const { data: workers } = await supabase
            .from('workers')
            .select('department')
            .eq('tenant_id', user.tenant_id)
            .eq('is_active', true)

          const countMap: Record<string, number> = {}
          workers?.forEach(w => {
            if (w.department) {
              countMap[w.department] = (countMap[w.department] || 0) + 1
            }
          })

          setDepartments(depts.map(d => ({
            ...d,
            worker_count: countMap[d.name] || 0,
          })))
        }
      } catch (error) {
        console.error('[OwnerDashboard] Error fetching departments:', error)
      }
    }
    fetchDepartments()
  }, [user])

  const handleApproveWorker = async (workerId: string) => {
    if (!user) return
    try {
      const supabase = createClient()
      await supabase
        .from('users')
        .update({
          is_active: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', workerId)

      setPendingWorkers(prev => prev.filter(w => w.id !== workerId))
    } catch (error) {
      console.error('[OwnerDashboard] Error approving worker:', error)
    }
  }

  const handleRejectWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to reject this worker?')) return
    try {
      const supabase = createClient()
      await supabase.from('users').delete().eq('id', workerId)
      setPendingWorkers(prev => prev.filter(w => w.id !== workerId))
    } catch (error) {
      console.error('[OwnerDashboard] Error rejecting worker:', error)
    }
  }

  const handleCreateAdmin = async () => {
    if (!user) return
    setAdminLoading(true)
    setAdminError(null)

    try {
      // Create admin via API route
      const res = await fetch('/api/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminForm.email,
          password: adminForm.password,
          fullName: adminForm.fullName,
          tenantId: user.tenant_id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create admin')

      setShowCreateAdmin(false)
      setAdminForm({ email: '', password: '', fullName: '' })
      alert('Admin account created successfully!')
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to create admin')
    } finally {
      setAdminLoading(false)
    }
  }

  // Chart data
  const revenueData = [
    { name: 'Jan', value: 42000, value2: 18000 },
    { name: 'Feb', value: 45000, value2: 19500 },
    { name: 'Mar', value: 48000, value2: 20000 },
    { name: 'Apr', value: 44000, value2: 21000 },
    { name: 'May', value: 51000, value2: 22500 },
    { name: 'Jun', value: 55000, value2: 24500 },
  ]

  const workforceData = [
    { name: 'Full-time', value: 65, color: '#6366f1' },
    { name: 'Part-time', value: 25, color: '#22c55e' },
    { name: 'Contract', value: 10, color: '#f59e0b' },
  ]

  const deptIcons: Record<string, string> = {
    'Engineering': '⚙️', 'Operations': '📦', 'Marketing': '📣', 'Finance': '💰',
    'Sales': '📈', 'HR': '👥', 'IT': '💻', 'Production': '🏭', 'Warehouse': '📦',
  }

  const alerts = [
    { text: `${pendingWorkers.length} ${t('dash.pendingApprovals')}`, color: pendingWorkers.length > 0 ? '#f59e0b' : '#22c55e' },
    { text: 'Payroll due in 5 days', color: '#ef4444' },
    { text: 'Compliance review scheduled', color: '#3b82f6' },
  ]

  const topTeams = [
    { name: 'Alpha Team', score: 94 },
    { name: 'Beta Team', score: 87 },
    { name: 'Delta Team', score: 82 },
  ]

  const v = (val: number | string) => (loading ? '—' : val)

  return (
    <>
      <DashboardShell
        fourColBottom
        statusPills={
          <>
            <div className="dash-pill">
              <span className="dash-pill-icon" style={{ background: '#6366f1' }} />
              {t('dash.employees')} <span className="dash-pill-value">{v(stats.totalWorkers)}</span>
            </div>
            <div className="dash-pill">
              <span className="dash-pill-icon" style={{ background: '#22c55e' }} />
              {t('dash.activeShifts')} <span className="dash-pill-value">{v(stats.activeShifts)}</span>
            </div>
            <div className="dash-pill">
              <span className="dash-pill-icon" style={{ background: '#f59e0b' }} />
              {t('dash.payroll')} <span className="dash-pill-value">{loading ? '—' : formatNPR(stats.monthlyPayroll, false)}</span>
            </div>
            {pendingWorkers.length > 0 && (
              <div className="dash-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <span className="dash-pill-icon" style={{ background: '#f59e0b' }} />
                {t('dash.pendingApprovals')} <span className="dash-pill-value" style={{ color: '#f59e0b' }}>{pendingWorkers.length}</span>
              </div>
            )}
          </>
        }
        heroPanel={
          <div className="dash-hero">
            <div className="dash-hero-title">{t('dash.companyOverview')}</div>
            <div className="dash-hero-subtitle">
              {t('dash.revenueVsLabor')} — {format(new Date(), 'MMMM yyyy')}
            </div>
            <div className="dash-hero-stats">
              <div className="dash-hero-stat">
                <span className="dash-hero-stat-value">{v(stats.totalWorkers)}</span>
                <span className="dash-hero-stat-label">{t('dash.totalEmployees')}</span>
              </div>
              <div className="dash-hero-stat">
                <span className="dash-hero-stat-value">{v(stats.presentToday)}</span>
                <span className="dash-hero-stat-label">{t('dash.presentToday')}</span>
              </div>
              <div className="dash-hero-stat">
                <span className="dash-hero-stat-value">{v(stats.attendanceRate)}%</span>
                <span className="dash-hero-stat-label">{t('dash.attendanceRate')}</span>
              </div>
            </div>
            <div className="dash-hero-chart">
              <MiniLineChart
                data={revenueData}
                color="#818cf8"
                color2="#34d399"
                height={130}
                showSecondLine
              />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ width: 20, height: 2, background: '#818cf8', borderRadius: 2 }} /> {t('dash.revenue')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ width: 20, height: 2, background: '#34d399', borderRadius: 2, borderTop: '1px dashed #34d399' }} /> {t('dash.laborCost')}
              </span>
            </div>
          </div>
        }
        rightPanel={
          <div className="dash-right-panel">
            {/* Pending Approvals Section */}
            {pendingWorkers.length > 0 && (
              <>
                <div className="dash-right-panel-title">
                  <span>{t('dash.pendingApprovals')}</span>
                  <span className="dash-badge dash-badge-warning">{pendingWorkers.length}</span>
                </div>

                {pendingWorkers.slice(0, 3).map((worker) => (
                  <div className="dash-list-item" key={worker.id} style={{ alignItems: 'center' }}>
                    <div className="dash-list-item-icon" style={{ fontSize: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      👤
                    </div>
                    <div className="dash-list-item-text" style={{ flex: 1 }}>
                      <div className="dash-list-item-title">{worker.full_name || worker.email}</div>
                      <div className="dash-list-item-subtitle">{worker.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="dash-icon-btn"
                        style={{ color: '#22c55e' }}
                        onClick={() => handleApproveWorker(worker.id)}
                        title="Approve"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        className="dash-icon-btn danger"
                        onClick={() => handleRejectWorker(worker.id)}
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {pendingWorkers.length > 3 && (
                  <div style={{ fontSize: 11, color: 'var(--dash-text-muted)', textAlign: 'center', marginTop: 4 }}>
                    +{pendingWorkers.length - 3} more pending
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--dash-border)', margin: '8px 0' }} />
              </>
            )}

            {/* Departments Section */}
            <div className="dash-right-panel-title">
              <span>{t('dash.departments')}</span>
              <Building2 size={16} className="dash-right-panel-info-icon" />
            </div>

            {departments.length > 0 ? departments.slice(0, 4).map((dept) => (
              <div className="dash-list-item" key={dept.id} onClick={() => router.push('/protected/departments')} style={{ cursor: 'pointer' }}>
                <div className="dash-list-item-icon">{deptIcons[dept.name] || '🏢'}</div>
                <div className="dash-list-item-text">
                  <div className="dash-list-item-title">{dept.name}</div>
                  <div className="dash-list-item-subtitle">{dept.worker_count} {t('common.employees')}</div>
                </div>
                <ChevronRight size={16} className="dash-list-item-arrow" />
              </div>
            )) : (
              <div style={{ fontSize: 12, color: 'var(--dash-text-muted)', padding: '8px 0' }}>
                {t('dash.noDepartments')}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: 12, marginTop: 4 }}>
              <div className="dash-right-panel-title" style={{ marginBottom: 8 }}>
                <span>{t('dash.alerts')}</span>
                <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
              </div>
              {alerts.map((alert, i) => (
                <div className="dash-alert-item" key={i}>
                  <span className="dash-alert-dot" style={{ background: alert.color }} />
                  {alert.text}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexDirection: 'column' }}>
              <button className="dash-btn dash-btn-primary" onClick={() => router.push('/protected/departments')}>
                <Plus size={16} /> {t('dash.addDepartment')}
              </button>
              <button
                className="dash-btn dash-btn-accent"
                onClick={() => setShowCreateAdmin(true)}
              >
                <ShieldCheck size={16} /> {t('dash.createAdmin')}
              </button>
            </div>
          </div>
        }
        bottomCards={
          <>
            {/* Payroll Overview */}
            <DashboardCard
              title={t('dash.payrollOverview')}
              subtitle={t('dash.currentPayCycle')}
              icon={<DollarSign size={18} />}
              iconBg="var(--dash-accent-soft)"
              animationDelay={0.1}
            >
              <div className="dash-stat-row">
                <span className="dash-stat-label">{t('dash.totalPayout')}</span>
                <span className="dash-stat-value">{loading ? '—' : formatNPR(stats.monthlyPayroll, false)}</span>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-label">{t('dash.pendingApprovals')}</span>
                <span className="dash-stat-value">{v(stats.pendingPayroll)}</span>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dash-text-muted)', marginBottom: 6 }}>
                  <span>{t('dash.payCycleProgress')}</span>
                  <span>68%</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar" style={{ width: '68%' }} />
                </div>
              </div>
            </DashboardCard>

            {/* Workforce Distribution */}
            <DashboardCard
              title={t('dash.workforceDistribution')}
              subtitle={t('dash.employeeTypeRatio')}
              icon={<Users size={18} />}
              iconBg="var(--dash-success-soft)"
              animationDelay={0.2}
            >
              <div className="dash-chart-container">
                <MiniDonutChart data={workforceData} />
              </div>
            </DashboardCard>

            {/* Attendance Health */}
            <DashboardCard
              title={t('dash.attendanceHealth')}
              subtitle={t('dash.thisMonthOverview')}
              icon={<UserCheck size={18} />}
              iconBg="var(--dash-warning-soft)"
              animationDelay={0.3}
            >
              <div className="dash-stat-row">
                <span className="dash-stat-label">{t('dash.lateCheckins')}</span>
                <span className="dash-badge dash-badge-warning">12</span>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-label">{t('dash.absenceRate')}</span>
                <span className="dash-badge dash-badge-danger">4.2%</span>
              </div>
              <div className="dash-stat-row">
                <span className="dash-stat-label">{t('dash.onTimeRate')}</span>
                <span className="dash-badge dash-badge-success">89%</span>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dash-text-muted)', marginBottom: 6 }}>
                  <span>{t('dash.attendanceTarget')}</span>
                  <span>89%</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar success" style={{ width: '89%' }} />
                </div>
              </div>
            </DashboardCard>

            {/* Performance Snapshot */}
            <DashboardCard
              title={t('dash.performanceSnapshot')}
              subtitle={t('dash.topPerformingTeams')}
              icon={<TrendingUp size={18} />}
              iconBg="var(--dash-info-soft)"
              animationDelay={0.4}
            >
              {topTeams.map((team) => (
                <div key={team.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--dash-text-primary)' }}>{team.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dash-accent)' }}>{team.score}%</span>
                  </div>
                  <div className="dash-progress">
                    <div className="dash-progress-bar" style={{ width: `${team.score}%` }} />
                  </div>
                </div>
              ))}
            </DashboardCard>
          </>
        }
      />

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <div className="dash-modal-overlay" onClick={() => { setShowCreateAdmin(false); setAdminError(null) }}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <div className="dash-modal-header-text">
                <h3>Create Admin Account</h3>
                <p>Create a new administrator for your organization</p>
              </div>
              <button
                className="dash-modal-close"
                onClick={() => { setShowCreateAdmin(false); setAdminError(null) }}
              >
                <XCircle size={16} />
              </button>
            </div>

            <div className="dash-modal-body">
              {adminError && (
                <div className="dash-form-error">
                  <AlertTriangle size={14} />
                  {adminError}
                </div>
              )}

              <div className="dash-form-field">
                <label className="dash-form-label">Full Name</label>
                <input
                  className="dash-form-input"
                  type="text"
                  placeholder="Enter full name"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                />
              </div>

              <div className="dash-form-field">
                <label className="dash-form-label">Email Address</label>
                <input
                  className="dash-form-input"
                  type="email"
                  placeholder="admin@company.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                />
              </div>

              <div className="dash-form-field">
                <label className="dash-form-label">Password</label>
                <input
                  className="dash-form-input"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
                <span style={{ fontSize: 11, color: 'var(--dash-text-muted)' }}>
                  Must be at least 8 characters long
                </span>
              </div>
            </div>

            <div className="dash-modal-footer">
              <button
                className="dash-btn dash-btn-outline"
                onClick={() => { setShowCreateAdmin(false); setAdminError(null) }}
              >
                Cancel
              </button>
              <button
                className="dash-btn dash-btn-accent"
                onClick={handleCreateAdmin}
                disabled={adminLoading || !adminForm.email || !adminForm.password || !adminForm.fullName}
              >
                {adminLoading ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

