'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { useLanguage } from '@/lib/i18n'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { MiniLineChart } from '@/components/dashboard/MiniChart'
import {
    Users,
    Clock,
    CalendarDays,
    ArrowRightLeft,
    FileText,
    Bell,
    UserPlus,
    ChevronRight,
    Plus,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Hourglass,
    Megaphone,
    ShieldCheck,
} from 'lucide-react'
import '@/app/dashboard.css'

interface PendingWorker {
    id: string
    email: string
    full_name: string | null
    created_at: string
}

export default function AdminDashboardPage() {
    const { user } = useUser()
    const router = useRouter()
    const { t } = useLanguage()
    const [stats, setStats] = useState({
        clockedIn: 0,
        onLeave: 3,
        overtime: 2,
        openShifts: 5,
        totalWorkers: 0,
    })
    const [loading, setLoading] = useState(true)
    const [pendingWorkers, setPendingWorkers] = useState<PendingWorker[]>([])

    // Role redirect
    useEffect(() => {
        if (user && user.role === 'worker') {
            router.replace('/protected/worker-dashboard')
        } else if (user && user.role === 'owner') {
            router.replace('/protected')
        }
    }, [user, router])

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const supabase = createClient()
                const today = format(new Date(), 'yyyy-MM-dd')

                const { count: presentCount } = await supabase
                    .from('attendance')
                    .select('*', { count: 'exact', head: true })
                    .eq('attendance_date', today)
                    .eq('status', 'present')

                const { count: workersCount } = await supabase
                    .from('workers')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true)

                setStats((prev) => ({
                    ...prev,
                    clockedIn: presentCount || 0,
                    totalWorkers: workersCount || 0,
                }))
            } catch (error) {
                console.error('[AdminDash] Error:', error)
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
                console.error('[AdminDash] Error fetching pending workers:', error)
            }
        }
        fetchPending()
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
            console.error('[AdminDash] Error approving worker:', error)
        }
    }

    const handleRejectWorker = async (workerId: string) => {
        if (!confirm('Are you sure you want to reject this worker?')) return
        try {
            const supabase = createClient()
            await supabase.from('users').delete().eq('id', workerId)
            setPendingWorkers(prev => prev.filter(w => w.id !== workerId))
        } catch (error) {
            console.error('[AdminDash] Error rejecting worker:', error)
        }
    }

    const v = (val: number | string) => (loading ? '—' : val)

    // Shift timeline data
    const shiftData = [
        { name: '6AM', value: 2 },
        { name: '8AM', value: 12 },
        { name: '10AM', value: 18 },
        { name: '12PM', value: 15 },
        { name: '2PM', value: 20 },
        { name: '4PM', value: 14 },
        { name: '6PM', value: 8 },
    ]

    const todayTasks = [
        { text: t('admin.reviewShiftSwaps'), badge: '3', type: 'warning' as const },
        { text: t('admin.approvePendingLeaves'), badge: '5', type: 'info' as const },
        { text: t('admin.processOvertimeReports'), badge: '2', type: 'danger' as const },
    ]

    const leaveRequests = [
        { name: 'Sarah Miller', type: 'Sick Leave', days: 2, status: 'pending' },
        { name: 'James Chen', type: 'Annual Leave', days: 5, status: 'pending' },
        { name: 'Maya Patel', type: 'Personal', days: 1, status: 'pending' },
    ]

    const upcomingShifts = [
        { title: 'Morning Shift A', time: '6:00 AM – 2:00 PM', count: 8 },
        { title: 'Afternoon Shift B', time: '2:00 PM – 10:00 PM', count: 6 },
        { title: 'Night Shift C', time: '10:00 PM – 6:00 AM', count: 4 },
    ]

    const newHires = [
        { name: 'Alex Johnson', role: 'Warehouse', since: '2 days ago' },
        { name: 'Priya Sharma', role: 'Logistics', since: '1 week ago' },
    ]

    const notifications = [
        { text: 'Updated overtime policy effective next month', icon: '📋', time: '2h ago' },
        { text: 'Annual health check reminder sent', icon: '🏥', time: '5h ago' },
        { text: 'New safety training module available', icon: '🛡️', time: '1d ago' },
    ]

    return (
        <DashboardShell
            fourColBottom
            statusPills={
                <>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: '#22c55e' }} />
                        {t('admin.clockedIn')} <span className="dash-pill-value">{v(stats.clockedIn)}</span>
                    </div>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: '#3b82f6' }} />
                        {t('admin.onLeave')} <span className="dash-pill-value">{v(stats.onLeave)}</span>
                    </div>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: '#f59e0b' }} />
                        {t('admin.overtime')} <span className="dash-pill-value">{v(stats.overtime)}</span>
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
                    <div className="dash-hero-title">{t('admin.liveMonitor')}</div>
                    <div className="dash-hero-subtitle">
                        {t('admin.realtimeAttendance')} — {format(new Date(), 'EEEE, MMMM d')}
                    </div>
                    <div className="dash-hero-stats">
                        <div className="dash-hero-stat">
                            <span className="dash-hero-stat-value">{v(stats.clockedIn)}</span>
                            <span className="dash-hero-stat-label">{t('admin.clockedIn')}</span>
                        </div>
                        <div className="dash-hero-stat">
                            <span className="dash-hero-stat-value">{v(stats.totalWorkers)}</span>
                            <span className="dash-hero-stat-label">{t('admin.totalHeadcount')}</span>
                        </div>
                        <div className="dash-hero-stat">
                            <span className="dash-hero-stat-value">{v(stats.openShifts)}</span>
                            <span className="dash-hero-stat-label">{t('admin.openShifts')}</span>
                        </div>
                    </div>

                    {/* Attendance Grid */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                        {Array.from({ length: Math.min(stats.totalWorkers || 12, 24) }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    background: i < (stats.clockedIn || 8)
                                        ? 'rgba(34, 197, 94, 0.3)'
                                        : 'rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    color: i < (stats.clockedIn || 8) ? '#86efac' : 'rgba(255,255,255,0.3)',
                                }}
                            >
                                {i < (stats.clockedIn || 8) ? '✓' : '·'}
                            </div>
                        ))}
                    </div>

                    <div className="dash-hero-chart">
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                            {t('admin.shiftActivityTimeline')}
                        </div>
                        <MiniLineChart data={shiftData} color="#818cf8" height={100} />
                    </div>
                </div>
            }
            rightPanel={
                <div className="dash-right-panel">
                    {/* Pending Worker Approvals */}
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

                            <div style={{ borderTop: '1px solid var(--dash-border)', margin: '8px 0' }} />
                        </>
                    )}

                    <div className="dash-right-panel-title">
                        <span>{t('admin.todayTasks')}</span>
                        <Clock size={16} className="dash-right-panel-info-icon" />
                    </div>

                    {todayTasks.map((task, i) => (
                        <div className="dash-list-item" key={i}>
                            <div className="dash-list-item-text">
                                <div className="dash-list-item-title">{task.text}</div>
                            </div>
                            <span className={`dash-badge dash-badge-${task.type}`}>{task.badge}</span>
                        </div>
                    ))}

                    <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: 12, marginTop: 4 }}>
                        <div className="dash-right-panel-title" style={{ marginBottom: 8 }}>
                            <span>{t('admin.leaveRequests')}</span>
                            <span className="dash-badge dash-badge-warning">{leaveRequests.length}</span>
                        </div>
                        {leaveRequests.map((req, i) => (
                            <div className="dash-list-item" key={i}>
                                <div className="dash-list-item-icon" style={{ fontSize: 14 }}>👤</div>
                                <div className="dash-list-item-text">
                                    <div className="dash-list-item-title">{req.name}</div>
                                    <div className="dash-list-item-subtitle">{req.type} · {req.days}d</div>
                                </div>
                                <ChevronRight size={14} className="dash-list-item-arrow" />
                            </div>
                        ))}
                    </div>

                    <button className="dash-btn dash-btn-accent" style={{ marginTop: 'auto' }} onClick={() => router.push('/protected/attendance')}>
                        <Plus size={16} /> {t('admin.createShift')}
                    </button>
                </div>
            }
            bottomCards={
                <>
                    {/* Shift Management */}
                    <DashboardCard
                        title={t('admin.shiftManagement')}
                        subtitle={t('admin.upcomingSwapRequests')}
                        icon={<CalendarDays size={18} />}
                        iconBg="var(--dash-accent-soft)"
                        animationDelay={0.1}
                    >
                        {upcomingShifts.map((shift) => (
                            <div key={shift.title} className="dash-stat-row">
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)' }}>{shift.title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--dash-text-muted)' }}>{shift.time}</div>
                                </div>
                                <span className="dash-badge dash-badge-neutral">{shift.count} {t('common.staff')}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', fontSize: 12, color: 'var(--dash-warning)' }}>
                            <ArrowRightLeft size={14} /> 3 {t('admin.swapRequestsPending')}
                        </div>
                    </DashboardCard>

                    {/* Leave Management */}
                    <DashboardCard
                        title={t('admin.leaveManagement')}
                        subtitle={t('admin.monthlySummary')}
                        icon={<FileText size={18} />}
                        iconBg="var(--dash-success-soft)"
                        animationDelay={0.2}
                    >
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('admin.approved')}</span>
                            <span className="dash-badge dash-badge-success">14</span>
                        </div>
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('admin.pending')}</span>
                            <span className="dash-badge dash-badge-warning">5</span>
                        </div>
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('admin.rejected')}</span>
                            <span className="dash-badge dash-badge-danger">2</span>
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dash-text-muted)', marginBottom: 6 }}>
                                <span>{t('admin.leaveUtilization')}</span>
                                <span>67%</span>
                            </div>
                            <div className="dash-progress">
                                <div className="dash-progress-bar info" style={{ width: '67%' }} />
                            </div>
                        </div>
                    </DashboardCard>

                    {/* Employee Directory Snapshot */}
                    <DashboardCard
                        title={t('admin.employeeDirectory')}
                        subtitle={t('admin.newHiresStatus')}
                        icon={<UserPlus size={18} />}
                        iconBg="var(--dash-info-soft)"
                        animationDelay={0.3}
                    >
                        {newHires.map((hire) => (
                            <div className="dash-list-item" key={hire.name} style={{ padding: '6px 0' }}>
                                <div className="dash-list-item-icon" style={{ width: 30, height: 30, fontSize: 12 }}>👤</div>
                                <div className="dash-list-item-text">
                                    <div className="dash-list-item-title">{hire.name}</div>
                                    <div className="dash-list-item-subtitle">{hire.role} · {hire.since}</div>
                                </div>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: 10, marginTop: 'auto' }}>
                            <div className="dash-stat-row">
                                <span className="dash-stat-label">{t('admin.onProbation')}</span>
                                <span className="dash-badge dash-badge-info">4</span>
                            </div>
                        </div>
                    </DashboardCard>

                    {/* Notifications Center */}
                    <DashboardCard
                        title={t('admin.notifications')}
                        subtitle={t('admin.hrAlerts')}
                        icon={<Bell size={18} />}
                        iconBg="var(--dash-warning-soft)"
                        animationDelay={0.4}
                    >
                        {notifications.map((notif, i) => (
                            <div className="dash-alert-item" key={i}>
                                <span style={{ fontSize: 14 }}>{notif.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, color: 'var(--dash-text-primary)' }}>{notif.text}</div>
                                    <div style={{ fontSize: 10, color: 'var(--dash-text-muted)', marginTop: 2 }}>{notif.time}</div>
                                </div>
                            </div>
                        ))}
                    </DashboardCard>
                </>
            }
        />
    )
}
