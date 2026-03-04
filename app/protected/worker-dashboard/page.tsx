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
import { ProgressRing } from '@/components/dashboard/MiniChart'
import {
    Clock,
    CalendarDays,
    DollarSign,
    TrendingUp,
    ChevronRight,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Megaphone,
    Timer,
    Zap,
} from 'lucide-react'
import '@/app/dashboard.css'

export default function WorkerDashboardPage() {
    const { user } = useUser()
    const router = useRouter()
    const { t } = useLanguage()
    const [clockedIn, setClockedIn] = useState(false)
    const [hoursToday, setHoursToday] = useState(0)
    const [stats, setStats] = useState({
        weeklyHours: 28,
        weeklyTarget: 40,
        leaveBalance: 12,
        streak: 14,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalEarnings: 0,
    })
    const [loading, setLoading] = useState(true)

    // Role redirect
    useEffect(() => {
        if (user && user.role !== 'worker') {
            router.replace(user.role === 'admin' ? '/protected/admin-dashboard' : '/protected')
        }
    }, [user, router])

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return
            try {
                const supabase = createClient()
                const startOfMonth = format(
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    'yyyy-MM-dd'
                )
                const today = format(new Date(), 'yyyy-MM-dd')

                const { data: workerData } = await supabase
                    .from('workers')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (!workerData) {
                    setLoading(false)
                    return
                }

                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('worker_id', workerData.id)
                    .gte('date', startOfMonth)
                    .lte('date', today)
                    .order('date', { ascending: false })

                if (attendanceData) {
                    setStats((prev) => ({
                        ...prev,
                        presentDays: attendanceData.filter((a) => a.status === 'present').length,
                        absentDays: attendanceData.filter((a) => a.status === 'absent').length,
                        lateDays: attendanceData.filter((a) => a.status === 'late').length,
                    }))
                }

                const { data: payrollData } = await supabase
                    .from('payroll')
                    .select('net_salary')
                    .eq('worker_id', workerData.id)
                    .eq('status', 'paid')
                    .gte('period_start_date', startOfMonth)

                if (payrollData) {
                    setStats((prev) => ({
                        ...prev,
                        totalEarnings: payrollData.reduce(
                            (sum, p) => sum + (Number(p.net_salary) || 0),
                            0
                        ),
                    }))
                }
            } catch (error) {
                console.error('[WorkerDash] Error:', error)
            } finally {
                setLoading(false)
            }
        }
        if (user) fetchData()
    }, [user])

    // Clock simulation
    useEffect(() => {
        if (clockedIn) {
            const interval = setInterval(() => {
                setHoursToday((h) => +(h + 0.01).toFixed(2))
            }, 36000) // Increment slowly for demo
            return () => clearInterval(interval)
        }
    }, [clockedIn])

    const v = (val: number | string) => (loading ? '—' : val)
    const weeklyPct = Math.round((stats.weeklyHours / stats.weeklyTarget) * 100)

    const upcomingShifts = [
        { day: 'Tomorrow', time: '8:00 AM – 4:00 PM', type: 'Morning' },
        { day: 'Wed', time: '8:00 AM – 4:00 PM', type: 'Morning' },
        { day: 'Thu', time: '2:00 PM – 10:00 PM', type: 'Afternoon' },
    ]

    const last7Days = [
        { day: 'Mon', status: 'present' },
        { day: 'Tue', status: 'present' },
        { day: 'Wed', status: 'late' },
        { day: 'Thu', status: 'present' },
        { day: 'Fri', status: 'present' },
        { day: 'Sat', status: 'off' },
        { day: 'Sun', status: 'off' },
    ]

    const statusColor: Record<string, string> = {
        present: '#22c55e',
        late: '#f59e0b',
        absent: '#ef4444',
        off: '#e2e8f0',
    }

    return (
        <DashboardShell
            statusPills={
                <>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: clockedIn ? '#22c55e' : '#9ca3af' }} />
                        {t('worker.hoursToday')} <span className="dash-pill-value">{hoursToday.toFixed(1)}h</span>
                    </div>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: '#6366f1' }} />
                        {t('worker.weekly')} <span className="dash-pill-value">{v(stats.weeklyHours)}h</span>
                    </div>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: '#3b82f6' }} />
                        {t('worker.leaveBalance')} <span className="dash-pill-value">{v(stats.leaveBalance)}</span>
                    </div>
                    <div className="dash-pill">
                        <span className="dash-pill-icon" style={{ background: '#f59e0b' }} />
                        {t('worker.streak')} <span className="dash-pill-value">{v(stats.streak)} {t('common.days')}</span>
                    </div>
                </>
            }
            heroPanel={
                <div className="dash-hero">
                    <div className="dash-hero-title">{t('worker.todayShift')}</div>
                    <div className="dash-hero-subtitle">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')} · {t('worker.morningShift')}
                    </div>

                    <div className="dash-hero-stats">
                        <div className="dash-hero-stat">
                            <span className="dash-hero-stat-value">8:00 AM</span>
                            <span className="dash-hero-stat-label">{t('worker.startTime')}</span>
                        </div>
                        <div className="dash-hero-stat">
                            <span className="dash-hero-stat-value">4:00 PM</span>
                            <span className="dash-hero-stat-label">{t('worker.endTime')}</span>
                        </div>
                        <div className="dash-hero-stat">
                            <span className="dash-hero-stat-value">{hoursToday.toFixed(1)}h</span>
                            <span className="dash-hero-stat-label">{t('worker.worked')}</span>
                        </div>
                    </div>

                    {/* Clock-in/out toggle */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            padding: '16px 20px',
                            marginBottom: 20,
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                                {clockedIn ? `🟢 ${t('worker.clockedIn')}` : `⚪ ${t('worker.clockedOut')}`}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                {clockedIn ? t('worker.tapClockOut') : t('worker.tapStartShift')}
                            </div>
                        </div>
                        <label style={{ cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                className="dash-toggle"
                                checked={clockedIn}
                                onChange={() => setClockedIn(!clockedIn)}
                            />
                        </label>
                    </div>

                    {/* Weekly progress */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                            <span>{t('worker.weeklyProgress')}</span>
                            <span>{stats.weeklyHours}h / {stats.weeklyTarget}h</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${Math.min(weeklyPct, 100)}%`,
                                    background: 'linear-gradient(90deg, #818cf8, #34d399)',
                                    borderRadius: 99,
                                    transition: 'width 0.8s ease',
                                }}
                            />
                        </div>
                    </div>
                </div>
            }
            rightPanel={
                <div className="dash-right-panel">
                    <div className="dash-right-panel-title">
                        <span>{t('worker.upcomingShifts')}</span>
                        <CalendarDays size={16} className="dash-right-panel-info-icon" />
                    </div>

                    {upcomingShifts.map((shift, i) => (
                        <div className="dash-list-item" key={i}>
                            <div className="dash-list-item-icon" style={{ fontSize: 12, fontWeight: 700 }}>
                                {shift.day.slice(0, 2)}
                            </div>
                            <div className="dash-list-item-text">
                                <div className="dash-list-item-title">{shift.day}</div>
                                <div className="dash-list-item-subtitle">{shift.time}</div>
                            </div>
                            <span className="dash-badge dash-badge-neutral">{shift.type}</span>
                        </div>
                    ))}

                    <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: 12, marginTop: 4 }}>
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('worker.leaveBalance')}</span>
                            <span className="dash-stat-value">{v(stats.leaveBalance)} {t('common.days')}</span>
                        </div>
                    </div>

                    <button className="dash-btn dash-btn-accent" style={{ marginTop: 'auto' }} onClick={() => router.push('/protected/attendance')}>
                        <Send size={16} /> {t('worker.requestLeave')}
                    </button>
                </div>
            }
            bottomCards={
                <>
                    {/* Attendance History */}
                    <DashboardCard
                        title={t('worker.attendanceHistory')}
                        subtitle={t('worker.last7Days')}
                        icon={<Clock size={18} />}
                        iconBg="var(--dash-success-soft)"
                        animationDelay={0.1}
                    >
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                            {last7Days.map((d) => (
                                <div
                                    key={d.day}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 10,
                                            background: statusColor[d.status] + '20',
                                            border: `2px solid ${statusColor[d.status]}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                        }}
                                    >
                                        {d.status === 'present' ? '✓' : d.status === 'late' ? '!' : d.status === 'absent' ? '✗' : '—'}
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--dash-text-muted)' }}>{d.day}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                            <div className="dash-stat-row">
                                <span className="dash-stat-label">{t('worker.present')}</span>
                                <span className="dash-badge dash-badge-success">{v(stats.presentDays)}</span>
                            </div>
                            <div className="dash-stat-row">
                                <span className="dash-stat-label">{t('worker.late')}</span>
                                <span className="dash-badge dash-badge-warning">{v(stats.lateDays)}</span>
                            </div>
                        </div>
                    </DashboardCard>

                    {/* Payslip Preview */}
                    <DashboardCard
                        title={t('worker.payslipPreview')}
                        subtitle={t('dash.currentPayCycle')}
                        icon={<DollarSign size={18} />}
                        iconBg="var(--dash-accent-soft)"
                        animationDelay={0.2}
                    >
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('worker.baseSalary')}</span>
                            <span className="dash-stat-value">{formatNPR(2800, false)}</span>
                        </div>
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('worker.overtime')}</span>
                            <span className="dash-stat-value">{formatNPR(350, false)}</span>
                        </div>
                        <div className="dash-stat-row">
                            <span className="dash-stat-label">{t('worker.deductions')}</span>
                            <span className="dash-stat-value" style={{ color: 'var(--dash-danger)' }}>−{formatNPR(420, false)}</span>
                        </div>
                        <div style={{ borderTop: '2px solid var(--dash-border)', paddingTop: 8, marginTop: 'auto' }}>
                            <div className="dash-stat-row">
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dash-text-primary)' }}>{t('worker.netPay')}</span>
                                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--dash-accent)' }}>
                                    {loading ? '—' : formatNPR(stats.totalEarnings > 0 ? stats.totalEarnings : 2730, false)}
                                </span>
                            </div>
                        </div>
                    </DashboardCard>

                    {/* Performance Metrics */}
                    <DashboardCard
                        title={t('worker.performance')}
                        subtitle={t('worker.kpiCompletion')}
                        icon={<TrendingUp size={18} />}
                        iconBg="var(--dash-info-soft)"
                        animationDelay={0.3}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
                            <ProgressRing percentage={88} color="#6366f1" label={t('worker.tasks')} />
                            <ProgressRing percentage={72} color="#22c55e" label={t('worker.quality')} />
                            <ProgressRing percentage={95} color="#f59e0b" label={t('dash.attendanceLabel')} />
                        </div>
                        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                            <span className="dash-badge dash-badge-success">{t('worker.aboveAverage')}</span>
                        </div>
                    </DashboardCard>
                </>
            }
        />
    )
}
