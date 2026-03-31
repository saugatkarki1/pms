'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { showSuccess, showError, getErrorMessage } from '@/lib/toast'
import { taskSchema, getValidationErrors } from '@/lib/validations'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Plus, Search, Edit2, Trash2, CheckCircle2, Clock, AlertTriangle, Zap, ListTodo, Eye, ArrowRight,
} from 'lucide-react'
import '@/app/dashboard.css'

interface Task {
  id: string
  title: string
  description?: string
  assigned_to?: string
  project_id?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  created_at: string
  workers?: { first_name: string; last_name: string } | null
  projects?: { name: string } | null
}

interface Worker { id: string; first_name: string; last_name: string; employee_id: string }
interface Project { id: string; name: string }

const STATUS_COLS = [
  { key: 'todo' as const, label: 'To Do', icon: ListTodo, color: '#9ca3af' },
  { key: 'in_progress' as const, label: 'In Progress', icon: Clock, color: '#3b82f6' },
  { key: 'review' as const, label: 'Review', icon: Eye, color: '#f59e0b' },
  { key: 'completed' as const, label: 'Completed', icon: CheckCircle2, color: '#22c55e' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9ca3af', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444',
}

export default function TasksPage() {
  const { user } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    title: '', description: '', assigned_to: '', project_id: '',
    status: 'todo' as Task['status'], priority: 'medium' as Task['priority'], due_date: '',
  })

  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, workers(first_name, last_name), projects(name)')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchWorkers = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('workers').select('id, first_name, last_name, employee_id')
      .eq('tenant_id', user.tenant_id).eq('is_active', true)
    setWorkers(data || [])
  }, [user])

  const fetchProjects = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('projects').select('id, name')
      .eq('tenant_id', user.tenant_id).eq('status', 'active')
    setProjects(data || [])
  }, [user])

  useEffect(() => { fetchTasks(); fetchWorkers(); fetchProjects() }, [fetchTasks, fetchWorkers, fetchProjects])
  useRealtimeTable('tasks', user?.tenant_id, fetchTasks)

  const handleOpenDialog = (task?: Task) => {
    setErrors({})
    if (task) {
      setEditingTask(task)
      setFormData({
        title: task.title, description: task.description || '',
        assigned_to: task.assigned_to || '', project_id: task.project_id || '',
        status: task.status, priority: task.priority, due_date: task.due_date || '',
      })
    } else {
      setEditingTask(null)
      setFormData({ title: '', description: '', assigned_to: '', project_id: '', status: 'todo', priority: 'medium', due_date: '' })
    }
    setOpenDialog(true)
  }

  const handleSave = async () => {
    const result = taskSchema.safeParse(formData)
    if (!result.success) { setErrors(getValidationErrors(result.error)); return }
    if (!user) return
    setSaving(true); setErrors({})
    try {
      const payload = {
        title: formData.title, description: formData.description || null,
        assigned_to: formData.assigned_to || null, project_id: formData.project_id || null,
        status: formData.status, priority: formData.priority, due_date: formData.due_date || null,
      }
      if (editingTask) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id)
        if (error) throw error
        showSuccess('Task updated successfully')
      } else {
        const { error } = await supabase.from('tasks').insert([{ tenant_id: user.tenant_id, created_by: user.id, ...payload }])
        if (error) throw error
        showSuccess('Task created successfully')
      }
      setOpenDialog(false); fetchTasks()
    } catch (error) {
      showError(getErrorMessage(error))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      showSuccess('Task deleted'); fetchTasks()
    } catch (error) { showError(getErrorMessage(error)) }
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
      if (error) throw error
      showSuccess(`Task moved to ${newStatus.replace('_', ' ')}`)
      fetchTasks()
    } catch (error) { showError(getErrorMessage(error)) }
  }

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchProject = filterProject === 'all' || t.project_id === filterProject
    return matchSearch && matchProject
  })

  const getTasksByStatus = (status: string) => filtered.filter(t => t.status === status)

  return (
    <DashboardShell>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Tasks</h1>
          <p className="dash-page-subtitle">Manage and track tasks across your team</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
              <Plus size={16} /> New Task
            </button>
          </DialogTrigger>
          <DialogContent style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
              <DialogDescription>{editingTask ? 'Update task details' : 'Add a new task'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Task title" />
                {errors.title && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.title}</span>}
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assign To</Label>
                  <Select value={formData.assigned_to} onValueChange={v => setFormData({ ...formData, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                    <SelectContent>
                      {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.first_name} {w.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
                  <Select value={formData.project_id} onValueChange={v => setFormData({ ...formData, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v: string) => setFormData({ ...formData, status: v as Task['status'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v: string) => setFormData({ ...formData, priority: v as Task['priority'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="dash-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-header">
            <span className="dash-metric-label">Total Tasks</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}><ListTodo size={16} /></div>
          </div>
          <div className="dash-metric-value">{tasks.length}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">In Progress</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-info-soft)', color: 'var(--dash-info)' }}><Clock size={16} /></div>
          </div>
          <div className="dash-metric-value">{tasks.filter(t => t.status === 'in_progress').length}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.15s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Urgent</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-danger-soft)', color: 'var(--dash-danger)' }}><AlertTriangle size={16} /></div>
          </div>
          <div className="dash-metric-value">{tasks.filter(t => t.priority === 'urgent').length}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Completed</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}><CheckCircle2 size={16} /></div>
          </div>
          <div className="dash-metric-value">{tasks.filter(t => t.status === 'completed').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div className="dash-search-wrap" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={16} className="dash-search-icon" />
          <input className="dash-search-input" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="dash-search-input" style={{ padding: '8px 12px', fontSize: 12, minWidth: 150 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="dash-loading">Loading tasks...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minHeight: 400 }}>
          {STATUS_COLS.map(col => {
            const colTasks = getTasksByStatus(col.key)
            const Icon = col.icon
            return (
              <div key={col.key} style={{ background: 'var(--dash-surface-alt)', borderRadius: 16, padding: 16, border: '1px solid var(--dash-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Icon size={16} style={{ color: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dash-text-primary)' }}>{col.label}</span>
                  <span className="dash-badge dash-badge-neutral" style={{ marginLeft: 'auto' }}>{colTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--dash-text-muted)', textAlign: 'center', padding: '24px 0' }}>No tasks</div>
                  ) : (
                    colTasks.map(task => (
                      <div key={task.id} style={{
                        background: 'var(--dash-surface)', borderRadius: 12, padding: 14, border: '1px solid var(--dash-border)',
                        transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dash-text-primary)', flex: 1 }}>{task.title}</span>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority], flexShrink: 0, marginTop: 4 }} title={task.priority} />
                        </div>
                        {task.description && <div style={{ fontSize: 11, color: 'var(--dash-text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}</div>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {task.workers && <span className="dash-badge dash-badge-neutral" style={{ fontSize: 10 }}>👤 {task.workers.first_name}</span>}
                          {task.projects && <span className="dash-badge dash-badge-neutral" style={{ fontSize: 10 }}>📁 {task.projects.name}</span>}
                          {task.due_date && <span className="dash-badge dash-badge-neutral" style={{ fontSize: 10 }}>📅 {task.due_date}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {col.key !== 'completed' && (
                            <button className="dash-icon-btn" title="Move forward" onClick={() => {
                              const next = STATUS_COLS[STATUS_COLS.findIndex(c => c.key === col.key) + 1]
                              if (next) handleStatusChange(task.id, next.key)
                            }}>
                              <ArrowRight size={12} />
                            </button>
                          )}
                          <button className="dash-icon-btn" onClick={() => handleOpenDialog(task)}><Edit2 size={12} /></button>
                          <button className="dash-icon-btn danger" onClick={() => handleDelete(task.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
