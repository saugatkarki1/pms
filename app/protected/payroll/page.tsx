'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit2, Trash2, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { useLanguage } from '@/lib/i18n'
import { formatNPR } from '@/lib/currency'
import '@/app/dashboard.css'

interface PayrollRecord {
  id: string
  worker_id: string
  period_start_date: string
  period_end_date: string
  base_salary: number
  overtime_pay: number
  deductions: number
  bonus: number
  net_salary: number
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  paid_date?: string
  workers?: {
    first_name: string
    last_name: string
    employee_id: string
  }
}

interface Worker {
  id: string
  first_name: string
  last_name: string
  employee_id: string
  salary_per_month?: number
}

export default function PayrollPage() {
  const { user } = useUser()
  const { t } = useLanguage()
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null)
  const [formData, setFormData] = useState({
    worker_id: '',
    period_start_date: '',
    period_end_date: '',
    base_salary: '',
    overtime_pay: '0',
    deductions: '0',
    bonus: '0',
  })

  const supabase = createClient()

  const fetchWorkers = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, first_name, last_name, employee_id, salary_per_month')
        .eq('tenant_id', user.tenant_id)
      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Failed to fetch workers:', error)
    }
  }

  const fetchPayroll = async () => {
    if (!user) return
    try {
      let query = supabase
        .from('payroll')
        .select('*, workers(first_name, last_name, employee_id)')
        .eq('tenant_id', user.tenant_id)
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      const { data, error } = await query.order('period_start_date', { ascending: false })
      if (error) throw error
      setPayrollRecords(data || [])
    } catch (error) {
      console.error('Failed to fetch payroll:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkers() }, [user])
  useEffect(() => { fetchPayroll() }, [user, statusFilter])

  const handleOpenDialog = (record?: PayrollRecord) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        worker_id: record.worker_id,
        period_start_date: record.period_start_date,
        period_end_date: record.period_end_date,
        base_salary: record.base_salary.toString(),
        overtime_pay: record.overtime_pay.toString(),
        deductions: record.deductions.toString(),
        bonus: record.bonus.toString(),
      })
    } else {
      setEditingRecord(null)
      const now = new Date()
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
      setFormData({
        worker_id: '',
        period_start_date: `${currentMonth}-01`,
        period_end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        base_salary: '',
        overtime_pay: '0',
        deductions: '0',
        bonus: '0',
      })
    }
    setOpenDialog(true)
  }

  const calculateNetSalary = () => {
    const base = parseFloat(formData.base_salary) || 0
    const overtime = parseFloat(formData.overtime_pay) || 0
    const deductions = parseFloat(formData.deductions) || 0
    const bonus = parseFloat(formData.bonus) || 0
    return base + overtime + bonus - deductions
  }

  const handleSavePayroll = async () => {
    if (!user || !formData.worker_id) return
    try {
      const netSalary = calculateNetSalary()
      if (editingRecord) {
        const { error } = await supabase
          .from('payroll')
          .update({
            base_salary: parseFloat(formData.base_salary),
            overtime_pay: parseFloat(formData.overtime_pay),
            deductions: parseFloat(formData.deductions),
            bonus: parseFloat(formData.bonus),
            net_salary: netSalary,
          })
          .eq('id', editingRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payroll')
          .insert([{
            tenant_id: user.tenant_id,
            worker_id: formData.worker_id,
            period_start_date: formData.period_start_date,
            period_end_date: formData.period_end_date,
            base_salary: parseFloat(formData.base_salary),
            overtime_pay: parseFloat(formData.overtime_pay),
            deductions: parseFloat(formData.deductions),
            bonus: parseFloat(formData.bonus),
            net_salary: netSalary,
            status: 'pending',
          }])
        if (error) throw error
      }
      setOpenDialog(false)
      fetchPayroll()
    } catch (error) {
      console.error('Failed to save payroll:', error)
    }
  }

  const handleStatusChange = async (recordId: string, newStatus: 'approved' | 'paid' | 'cancelled') => {
    try {
      const updates: Record<string, any> = { status: newStatus }
      if (newStatus === 'paid') updates.paid_date = new Date().toISOString()
      const { error } = await supabase.from('payroll').update(updates).eq('id', recordId)
      if (error) throw error
      fetchPayroll()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return
    try {
      const { error } = await supabase.from('payroll').delete().eq('id', recordId)
      if (error) throw error
      fetchPayroll()
    } catch (error) {
      console.error('Failed to delete record:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      pending: { cls: 'dash-badge-warning', label: 'Pending' },
      approved: { cls: 'dash-badge-info', label: 'Approved' },
      paid: { cls: 'dash-badge-success', label: 'Paid' },
      cancelled: { cls: 'dash-badge-danger', label: 'Cancelled' },
    }
    const s = map[status] || { cls: 'dash-badge-neutral', label: status }
    return <span className={`dash-badge ${s.cls}`}>{s.label}</span>
  }

  const filteredRecords = payrollRecords.filter(
    (r) =>
      r.workers?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.workers?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.workers?.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPayroll = filteredRecords.reduce((sum, r) => sum + r.net_salary, 0)
  const pendingCount = filteredRecords.filter((r) => r.status === 'pending').length
  const paidCount = filteredRecords.filter((r) => r.status === 'paid').length

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('payroll.title')}</h1>
          <p className="dash-page-subtitle">{t('payroll.subtitle')}</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
              <Plus size={16} /> {t('payroll.createPayroll')}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRecord ? t('payroll.editPayroll') : t('payroll.createNew')}</DialogTitle>
              <DialogDescription>
                {editingRecord ? t('payroll.updateInfo') : t('payroll.createRecord')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('payroll.worker')}</Label>
                  <Select value={formData.worker_id} onValueChange={(value) => setFormData({ ...formData, worker_id: value })}>
                    <SelectTrigger><SelectValue placeholder={t('payroll.selectWorker')} /></SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.first_name} {w.last_name} ({w.employee_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('payroll.baseSalary')}</Label>
                  <Input type="number" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} placeholder="5000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('payroll.periodStart')}</Label>
                  <Input type="date" value={formData.period_start_date} onChange={(e) => setFormData({ ...formData, period_start_date: e.target.value })} />
                </div>
                <div>
                  <Label>{t('payroll.periodEnd')}</Label>
                  <Input type="date" value={formData.period_end_date} onChange={(e) => setFormData({ ...formData, period_end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('payroll.overtimePay')}</Label>
                  <Input type="number" value={formData.overtime_pay} onChange={(e) => setFormData({ ...formData, overtime_pay: e.target.value })} />
                </div>
                <div>
                  <Label>{t('payroll.bonus')}</Label>
                  <Input type="number" value={formData.bonus} onChange={(e) => setFormData({ ...formData, bonus: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('payroll.deductions')}</Label>
                  <Input type="number" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })} />
                </div>
              </div>
              <div className="dash-card" style={{ padding: 16, background: 'var(--dash-surface-alt)' }}>
                <div style={{ fontSize: 12, color: 'var(--dash-text-muted)' }}>{t('payroll.netSalary')}:</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dash-accent)' }}>{formatNPR(calculateNetSalary())}</div>
              </div>
              <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSavePayroll}>
                {editingRecord ? t('common.update') : t('common.create')} {t('payroll.title')}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="dash-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('payroll.totalPayroll')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{formatNPR(totalPayroll)}</div>
          <div className="dash-metric-detail">{filteredRecords.length} {t('common.records')}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('payroll.pending')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-warning-soft)', color: 'var(--dash-warning)' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{pendingCount}</div>
          <div className="dash-metric-detail">{t('payroll.awaitingApproval')}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('payroll.paid')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{paidCount}</div>
          <div className="dash-metric-detail">{t('payroll.completed')}</div>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="dash-filter-row">
        <span className="dash-filter-label">{t('payroll.status')}:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ maxWidth: 200 }}><SelectValue placeholder={t('payroll.allStatuses')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payroll.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('payroll.pending')}</SelectItem>
            <SelectItem value="approved">{t('payroll.approved')}</SelectItem>
            <SelectItem value="paid">{t('payroll.paid')}</SelectItem>
            <SelectItem value="cancelled">{t('payroll.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="dash-search-wrap">
        <Search size={16} className="dash-search-icon" />
        <input
          className="dash-search-input"
          placeholder={t('payroll.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Payroll Table */}
      <div className="dash-table-card">
        <div className="dash-table-header">
          <div className="dash-table-title">{t('payroll.records')}</div>
          <div className="dash-table-subtitle">{filteredRecords.length} record(s)</div>
        </div>
        <div className="dash-table-body">
          {loading ? (
            <div className="dash-loading">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="dash-empty-state">{t('payroll.noRecords')}</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>{t('payroll.employee')}</th>
                  <th>{t('payroll.period')}</th>
                  <th className="text-right">{t('payroll.baseSalary')}</th>
                  <th className="text-right">{t('payroll.netSalary')}</th>
                  <th>{t('payroll.status')}</th>
                  <th>{t('payroll.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{`${record.workers?.first_name} ${record.workers?.last_name}`}</td>
                    <td className="text-muted">{`${record.period_start_date} — ${record.period_end_date}`}</td>
                    <td className="text-right">{formatNPR(record.base_salary)}</td>
                    <td className="text-right font-semibold">{formatNPR(record.net_salary)}</td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td>
                      <div className="dash-table-actions">
                        {record.status === 'pending' && (
                          <button className="dash-action-btn" onClick={() => handleStatusChange(record.id, 'approved')}>{t('payroll.approve')}</button>
                        )}
                        {record.status === 'approved' && (
                          <button className="dash-action-btn" onClick={() => handleStatusChange(record.id, 'paid')}>{t('payroll.markPaid')}</button>
                        )}
                        <button className="dash-icon-btn" onClick={() => handleOpenDialog(record)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="dash-icon-btn danger" onClick={() => handleDeleteRecord(record.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
