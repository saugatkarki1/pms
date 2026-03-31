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
import { Button } from '@/components/ui/button'
import { Plus, Search, Edit2, Trash2, Users, DollarSign, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { useLanguage } from '@/lib/i18n'
import { formatNPR } from '@/lib/currency'
import type { Worker } from '@/lib/workers'
import '@/app/dashboard.css'

export default function WorkersPage() {
  const { user } = useUser()
  const { t } = useLanguage()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)

  // Filters
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employment_type: 'full_time' as string,
    department: '',
    position: '',
    salary_per_month: '',
    hire_date: '',
    bonus: '',
    overtime_pay: '',
    increment: '',
    retroactive_adjustment: '',
  })

  const supabase = createClient()

  const fetchWorkers = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('first_name')

      if (error) throw error
      setWorkers(data || [])
    } catch (error: any) {
      console.error('Failed to fetch workers:', error?.message || error?.code || JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
  }, [user])

  const handleOpenDialog = (worker?: Worker) => {
    if (worker) {
      setEditingWorker(worker)
      setFormData({
        employee_id: worker.employee_id,
        first_name: worker.first_name,
        last_name: worker.last_name,
        email: worker.email || '',
        phone: worker.phone || '',
        employment_type: worker.employment_type,
        department: worker.department || '',
        position: worker.position || '',
        salary_per_month: worker.salary_per_month?.toString() || '',
        hire_date: worker.hire_date,
        bonus: (worker as any).bonus?.toString() || '0',
        overtime_pay: (worker as any).overtime_pay?.toString() || '0',
        increment: (worker as any).increment?.toString() || '0',
        retroactive_adjustment: (worker as any).retroactive_adjustment?.toString() || '0',
      })
    } else {
      setEditingWorker(null)
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        employment_type: 'full_time',
        department: '',
        position: '',
        salary_per_month: '',
        hire_date: '',
        bonus: '0',
        overtime_pay: '0',
        increment: '0',
        retroactive_adjustment: '0',
      })
    }
    setOpenDialog(true)
  }

  const handleSaveWorker = async () => {
    if (!user) return
    try {
      const workerData = {
        employee_id: formData.employee_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        employment_type: formData.employment_type,
        department: formData.department,
        position: formData.position,
        salary_per_month: formData.salary_per_month ? parseFloat(formData.salary_per_month) : null,
        hire_date: formData.hire_date,
        bonus: parseFloat(formData.bonus) || 0,
        overtime_pay: parseFloat(formData.overtime_pay) || 0,
        increment: parseFloat(formData.increment) || 0,
        retroactive_adjustment: parseFloat(formData.retroactive_adjustment) || 0,
      }

      if (editingWorker) {
        const { error } = await supabase
          .from('workers')
          .update(workerData)
          .eq('id', editingWorker.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('workers')
          .insert([{
            tenant_id: user.tenant_id,
            ...workerData,
          }])
        if (error) throw error
      }
      setOpenDialog(false)
      fetchWorkers()
    } catch (error: any) {
      console.error('Failed to save worker:', error?.message || error?.code || JSON.stringify(error))
    }
  }

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker?')) return
    try {
      const { error } = await supabase.from('workers').delete().eq('id', workerId)
      if (error) throw error
      fetchWorkers()
    } catch (error: any) {
      console.error('Failed to delete worker:', error?.message || error?.code || JSON.stringify(error))
    }
  }

  // Get unique departments for filter
  const uniqueDepts = Array.from(new Set(workers.map(w => w.department).filter(Boolean))) as string[]
  const uniqueTypes = Array.from(new Set(workers.map(w => w.employment_type)))

  // Apply filters
  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = filterDepartment === 'all' || w.department === filterDepartment
    const matchesType = filterType === 'all' || w.employment_type === filterType
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && w.is_active) ||
      (filterStatus === 'inactive' && !w.is_active)
    return matchesSearch && matchesDept && matchesType && matchesStatus
  })

  // Salary metrics
  const totalPayroll = workers.reduce((sum, w) => sum + (w.salary_per_month || 0), 0)
  const totalBonuses = workers.reduce((sum, w) => sum + ((w as any).bonus || 0), 0)
  const avgSalary = workers.length > 0 ? totalPayroll / workers.length : 0

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('workers.title')}</h1>
          <p className="dash-page-subtitle">{t('workers.subtitle')}</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
              <Plus size={16} /> {t('workers.addWorker')}
            </button>
          </DialogTrigger>
          <DialogContent style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <DialogHeader>
              <DialogTitle>{editingWorker ? t('workers.editWorker') : t('workers.addNew')}</DialogTitle>
              <DialogDescription>
                {editingWorker ? t('workers.updateInfo') : t('workers.addToTeam')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('workers.employeeId')}</Label>
                  <Input value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} placeholder="EMP001" />
                </div>
                <div>
                  <Label>{t('workers.firstName')}</Label>
                  <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="John" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('workers.lastName')}</Label>
                  <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Doe" />
                </div>
                <div>
                  <Label>{t('workers.email')}</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('workers.phone')}</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+977-9800000000" />
                </div>
                <div>
                  <Label>{t('workers.employmentType')}</Label>
                  <Select value={formData.employment_type} onValueChange={(value: any) => setFormData({ ...formData, employment_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('workers.department')}</Label>
                  <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Sales" />
                </div>
                <div>
                  <Label>{t('workers.position')}</Label>
                  <Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="Manager" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('workers.monthlySalary')}</Label>
                  <Input type="number" value={formData.salary_per_month} onChange={(e) => setFormData({ ...formData, salary_per_month: e.target.value })} placeholder="50000" />
                </div>
                <div>
                  <Label>{t('workers.hireDate')}</Label>
                  <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
                </div>
              </div>

              {/* Salary Management Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t('salary.management')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('salary.bonus')}</Label>
                    <Input type="number" value={formData.bonus} onChange={(e) => setFormData({ ...formData, bonus: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <Label>{t('salary.overtimePay')}</Label>
                    <Input type="number" value={formData.overtime_pay} onChange={(e) => setFormData({ ...formData, overtime_pay: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4" style={{ marginTop: 8 }}>
                  <div>
                    <Label>{t('salary.increment')}</Label>
                    <Input type="number" value={formData.increment} onChange={(e) => setFormData({ ...formData, increment: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <Label>{t('salary.retroactive')}</Label>
                    <Input type="number" value={formData.retroactive_adjustment} onChange={(e) => setFormData({ ...formData, retroactive_adjustment: e.target.value })} placeholder="0" />
                  </div>
                </div>
              </div>

              <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSaveWorker}>
                {editingWorker ? t('common.update') : t('common.create')} {t('workers.title')}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="dash-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('workers.totalWorkers')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{workers.length}</div>
          <div className="dash-metric-detail">{t('workers.activeEmployees')}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('salary.totalPayroll')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{formatNPR(totalPayroll, false)}</div>
          <div className="dash-metric-detail">{t('salary.monthlyTotal')}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.15s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('salary.pendingBonuses')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-warning-soft)', color: 'var(--dash-warning)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{formatNPR(totalBonuses, false)}</div>
          <div className="dash-metric-detail">{t('salary.bonusesAwarded')}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">{t('salary.avgSalary')}</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-info-soft)', color: 'var(--dash-info)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{formatNPR(Math.round(avgSalary), false)}</div>
          <div className="dash-metric-detail">{t('salary.perEmployee')}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div className="dash-search-wrap" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={16} className="dash-search-icon" />
          <input
            className="dash-search-input"
            placeholder={t('workers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="dash-search-input"
            style={{ padding: '8px 12px', fontSize: 12, minWidth: 130 }}
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="all">{t('filters.allDepartments')}</option>
            {uniqueDepts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className="dash-search-input"
            style={{ padding: '8px 12px', fontSize: 12, minWidth: 120 }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">{t('filters.allTypes')}</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            className="dash-search-input"
            style={{ padding: '8px 12px', fontSize: 12, minWidth: 100 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">{t('filters.allStatuses')}</option>
            <option value="active">{t('filters.active')}</option>
            <option value="inactive">{t('filters.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="dash-table-card">
        <div className="dash-table-header">
          <div className="dash-table-title">{t('workers.title')}</div>
          <div className="dash-table-subtitle">{filteredWorkers.length} worker(s)</div>
        </div>
        <div className="dash-table-body">
          {loading ? (
            <div className="dash-loading">Loading...</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="dash-empty-state">{t('workers.noWorkers')}</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('workers.name')}</th>
                  <th>{t('workers.email')}</th>
                  <th>{t('workers.department')}</th>
                  <th>{t('workers.type')}</th>
                  <th>{t('workers.salary')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id}>
                    <td className="font-medium">{worker.employee_id}</td>
                    <td>{`${worker.first_name} ${worker.last_name}`}</td>
                    <td className="text-muted">{worker.email || '—'}</td>
                    <td>{worker.department || '—'}</td>
                    <td>
                      <span className="dash-badge dash-badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {worker.employment_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{worker.salary_per_month ? formatNPR(worker.salary_per_month, false) : '—'}</td>
                    <td>
                      <span className={`dash-badge ${worker.is_active ? 'dash-badge-success' : 'dash-badge-warning'}`}>
                        {worker.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="dash-table-actions">
                        <button className="dash-icon-btn" onClick={() => handleOpenDialog(worker)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="dash-icon-btn danger" onClick={() => handleDeleteWorker(worker.id)}>
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
