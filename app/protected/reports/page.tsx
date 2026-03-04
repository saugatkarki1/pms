'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { useLanguage } from '@/lib/i18n'
import { formatNPR } from '@/lib/currency'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '@/app/dashboard.css'

interface AttendanceStats {
  date: string
  present: number
  absent: number
  late: number
  on_leave: number
  half_day: number
}

interface PayrollStats {
  month: string
  total: number
  paid: number
  pending: number
}

export default function ReportsPage() {
  const { user } = useUser()
  const { t } = useLanguage()
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats[]>([])
  const [payrollStats, setPayrollStats] = useState<PayrollStats[]>([])
  const [reportType, setReportType] = useState('attendance')
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const fetchAttendanceReport = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('attendance_date, status')
        .eq('tenant_id', user.tenant_id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
      if (error) throw error

      const grouped: Record<string, Record<string, number>> = {}
      data?.forEach((record: any) => {
        const date = record.attendance_date
        if (!grouped[date]) grouped[date] = { present: 0, absent: 0, late: 0, on_leave: 0, half_day: 0 }
        grouped[date][record.status]++
      })

      const stats: AttendanceStats[] = Object.entries(grouped).map(([date, counts]) => ({
        date, present: counts.present || 0, absent: counts.absent || 0, late: counts.late || 0, on_leave: counts.on_leave || 0, half_day: counts.half_day || 0,
      }))
      setAttendanceStats(stats.sort((a, b) => a.date.localeCompare(b.date)))
    } catch (error) {
      console.error('Failed to fetch attendance report:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayrollReport = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('period_start_date, net_salary, status')
        .eq('tenant_id', user.tenant_id)
        .gte('period_start_date', startDate)
        .lte('period_start_date', endDate)
      if (error) throw error

      const grouped: Record<string, { total: number; paid: number; pending: number }> = {}
      data?.forEach((record: any) => {
        const month = record.period_start_date.substring(0, 7)
        if (!grouped[month]) grouped[month] = { total: 0, paid: 0, pending: 0 }
        grouped[month].total += record.net_salary
        if (record.status === 'paid') grouped[month].paid += record.net_salary
        else if (record.status === 'pending') grouped[month].pending += record.net_salary
      })

      const stats = Object.entries(grouped).map(([month, counts]) => ({ month, ...counts }))
      setPayrollStats(stats.sort((a, b) => a.month.localeCompare(b.month)))
    } catch (error) {
      console.error('Failed to fetch payroll report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (reportType === 'attendance') fetchAttendanceReport()
    else fetchPayrollReport()
  }, [user, reportType, startDate, endDate])

  const handleExportCSV = () => {
    const data = reportType === 'attendance' ? attendanceStats : payrollStats
    const headers = reportType === 'attendance'
      ? ['Date', 'Present', 'Absent', 'Late', 'On Leave', 'Half Day']
      : ['Month', 'Total', 'Paid', 'Pending']

    let csv = headers.join(',') + '\n'
    data.forEach((row: any) => {
      if (reportType === 'attendance') csv += `${row.date},${row.present},${row.absent},${row.late},${row.on_leave},${row.half_day}\n`
      else csv += `${row.month},${row.total.toFixed(2)},${row.paid.toFixed(2)},${row.pending.toFixed(2)}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const attendanceChartData = attendanceStats.map(stat => ({
    name: stat.date, Present: stat.present, Absent: stat.absent, Late: stat.late,
  }))

  const payrollChartData = payrollStats.map(stat => ({
    name: stat.month, Total: stat.total, Paid: stat.paid, Pending: stat.pending,
  }))

  const COLORS = {
    present: '#22c55e',
    absent: '#ef4444',
    late: '#f59e0b',
    paid: '#6366f1',
    pending: '#f59e0b',
  }

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('reports.title')}</h1>
          <p className="dash-page-subtitle">{t('reports.subtitle')}</p>
        </div>
      </div>

      {/* Report Controls */}
      <div className="dash-section-card">
        <div className="dash-section-header">
          <div className="dash-section-title">Report Settings</div>
        </div>
        <div className="dash-section-body">
          <div className="dash-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="dash-form-field">
              <label className="dash-form-label">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance Report</SelectItem>
                  <SelectItem value="payroll">Payroll Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="dash-form-field" style={{ justifyContent: 'flex-end' }}>
              <button className="dash-btn dash-btn-primary" onClick={handleExportCSV}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {reportType === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dash-gap)' }}>
          <div className="dash-chart-card">
            <div className="dash-chart-card-header">
              <div className="dash-chart-card-title">Attendance Overview</div>
              <div className="dash-chart-card-subtitle">Daily attendance status distribution</div>
            </div>
            {loading ? (
              <div className="dash-loading">Loading...</div>
            ) : attendanceChartData.length === 0 ? (
              <div className="dash-empty-state">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--dash-surface)', border: '1px solid var(--dash-border)', borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="Present" fill={COLORS.present} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Absent" fill={COLORS.absent} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Late" fill={COLORS.late} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-card-header">
              <div className="dash-chart-card-title">Attendance Trend</div>
              <div className="dash-chart-card-subtitle">Present employees over time</div>
            </div>
            {loading ? (
              <div className="dash-loading">Loading...</div>
            ) : attendanceChartData.length === 0 ? (
              <div className="dash-empty-state">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--dash-surface)', border: '1px solid var(--dash-border)', borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="Present" stroke={COLORS.present} strokeWidth={2} />
                  <Line type="monotone" dataKey="Absent" stroke={COLORS.absent} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {reportType === 'payroll' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dash-gap)' }}>
          <div className="dash-chart-card">
            <div className="dash-chart-card-header">
              <div className="dash-chart-card-title">Payroll Summary</div>
              <div className="dash-chart-card-subtitle">Monthly payroll distribution</div>
            </div>
            {loading ? (
              <div className="dash-loading">Loading...</div>
            ) : payrollChartData.length === 0 ? (
              <div className="dash-empty-state">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payrollChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--dash-surface)', border: '1px solid var(--dash-border)', borderRadius: 12, fontSize: 12 }} formatter={(value) => formatNPR(value as number)} />
                  <Legend />
                  <Bar dataKey="Paid" fill={COLORS.paid} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pending" fill={COLORS.pending} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-card-header">
              <div className="dash-chart-card-title">Payroll Trend</div>
              <div className="dash-chart-card-subtitle">Total payroll over time</div>
            </div>
            {loading ? (
              <div className="dash-loading">Loading...</div>
            ) : payrollChartData.length === 0 ? (
              <div className="dash-empty-state">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={payrollChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--dash-surface)', border: '1px solid var(--dash-border)', borderRadius: 12, fontSize: 12 }} formatter={(value) => formatNPR(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="Total" stroke={COLORS.paid} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
