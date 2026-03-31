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
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import '@/app/dashboard.css'

interface AttendanceRecord {
  id: string
  worker_id: string
  attendance_date: string
  check_in_time?: string
  check_out_time?: string
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'half_day'
  notes?: string
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
}

export default function AttendancePage() {
  const { user } = useUser()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [formData, setFormData] = useState<{
    worker_id: string
    attendance_date: string
    status: 'present' | 'absent' | 'late' | 'on_leave' | 'half_day'
    check_in_time: string
    check_out_time: string
    notes: string
  }>({
    worker_id: '',
    attendance_date: selectedDate,
    status: 'present',
    check_in_time: '',
    check_out_time: '',
    notes: '',
  })

  const supabase = createClient()

  const fetchWorkers = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, first_name, last_name, employee_id')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true)
      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Failed to fetch workers:', error)
    }
  }

  const fetchAttendance = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, workers(first_name, last_name, employee_id)')
        .eq('tenant_id', user.tenant_id)
        .eq('attendance_date', selectedDate)
      if (error) throw error
      setAttendanceRecords(data || [])
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkers() }, [user])
  useEffect(() => { fetchAttendance() }, [user, selectedDate])

  const handleOpenDialog = (record?: AttendanceRecord) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        worker_id: record.worker_id,
        attendance_date: record.attendance_date,
        status: record.status,
        check_in_time: record.check_in_time || '',
        check_out_time: record.check_out_time || '',
        notes: record.notes || '',
      })
    } else {
      setEditingRecord(null)
      setFormData({
        worker_id: '',
        attendance_date: selectedDate,
        status: 'present',
        check_in_time: '',
        check_out_time: '',
        notes: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSaveAttendance = async () => {
    if (!user || !formData.worker_id) return
    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('attendance')
          .update({
            status: formData.status,
            check_in_time: formData.check_in_time || null,
            check_out_time: formData.check_out_time || null,
            notes: formData.notes || null,
          })
          .eq('id', editingRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert([{
            tenant_id: user.tenant_id,
            worker_id: formData.worker_id,
            attendance_date: formData.attendance_date,
            status: formData.status,
            check_in_time: formData.check_in_time || null,
            check_out_time: formData.check_out_time || null,
            notes: formData.notes || null,
          }])
        if (error) throw error
      }
      setOpenDialog(false)
      fetchAttendance()
    } catch (error) {
      console.error('Failed to save attendance:', error)
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', recordId)
      if (error) throw error
      fetchAttendance()
    } catch (error) {
      console.error('Failed to delete record:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      present: { cls: 'dash-badge-success', label: 'Present' },
      absent: { cls: 'dash-badge-danger', label: 'Absent' },
      late: { cls: 'dash-badge-warning', label: 'Late' },
      on_leave: { cls: 'dash-badge-info', label: 'On Leave' },
      half_day: { cls: 'dash-badge-neutral', label: 'Half Day' },
    }
    const s = map[status] || { cls: 'dash-badge-neutral', label: status }
    return <span className={`dash-badge ${s.cls}`}>{s.label}</span>
  }

  const filteredRecords = attendanceRecords.filter(
    (r) =>
      (r.workers?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.workers?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.workers?.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) ??
      false
  )

  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Attendance</h1>
          <p className="dash-page-subtitle">Track and manage employee attendance</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
              <Plus size={16} /> Mark Attendance
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
              <DialogDescription>
                {editingRecord ? 'Update attendance record' : 'Record attendance for an employee'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Worker</Label>
                <Select value={formData.worker_id} onValueChange={(value) => setFormData({ ...formData, worker_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select a worker" /></SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.first_name} {w.last_name} ({w.employee_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={formData.attendance_date} onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check In Time</Label>
                  <Input type="time" value={formData.check_in_time} onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })} />
                </div>
                <div>
                  <Label>Check Out Time</Label>
                  <Input type="time" value={formData.check_out_time} onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes" />
              </div>
              <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSaveAttendance}>
                {editingRecord ? 'Update' : 'Mark'} Attendance
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="dash-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-header">
            <span className="dash-metric-label">Present</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{presentCount}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Absent</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-danger-soft)', color: 'var(--dash-danger)' }}>
              <XCircle size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{absentCount}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Late</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-warning-soft)', color: 'var(--dash-warning)' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="dash-metric-value">{lateCount}</div>
        </div>
      </div>

      {/* Date Selector + Search */}
      <div className="dash-filter-row">
        <span className="dash-filter-label">Date:</span>
        <input
          type="date"
          className="dash-search-input"
          style={{ width: 180, paddingLeft: 16 }}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="dash-search-wrap">
        <Search size={16} className="dash-search-icon" />
        <input
          className="dash-search-input"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Attendance Table */}
      <div className="dash-table-card">
        <div className="dash-table-header">
          <div className="dash-table-title">Attendance Records</div>
          <div className="dash-table-subtitle">{filteredRecords.length} record(s) for {selectedDate}</div>
        </div>
        <div className="dash-table-body">
          {loading ? (
            <div className="dash-loading">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="dash-empty-state">No records for this date</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{`${record.workers?.first_name} ${record.workers?.last_name}`}</td>
                    <td className="text-muted">{record.workers?.employee_id}</td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td>{record.check_in_time || '—'}</td>
                    <td>{record.check_out_time || '—'}</td>
                    <td className="truncate">{record.notes || '—'}</td>
                    <td>
                      <div className="dash-table-actions">
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
