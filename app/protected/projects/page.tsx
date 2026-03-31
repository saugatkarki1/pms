'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { showSuccess, showError, getErrorMessage } from '@/lib/toast'
import { projectSchema, getValidationErrors } from '@/lib/validations'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit2, Trash2, FolderKanban, CheckCircle2, Archive } from 'lucide-react'
import '@/app/dashboard.css'

interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'archived'
  start_date?: string
  end_date?: string
  created_at: string
  task_count?: number
  completed_tasks?: number
}

export default function ProjectsPage() {
  const { user } = useUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '', description: '', status: 'active' as Project['status'],
    start_date: '', end_date: '',
  })

  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    if (!user) return
    try {
      const { data: projs, error } = await supabase
        .from('projects').select('*').eq('tenant_id', user.tenant_id).order('created_at', { ascending: false })
      if (error) throw error

      // Get task counts per project
      const { data: tasks } = await supabase
        .from('tasks').select('project_id, status').eq('tenant_id', user.tenant_id)

      const enriched = (projs || []).map((p: Project) => {
        const projTasks = (tasks || []).filter((t: { project_id: string; status: string }) => t.project_id === p.id)
        return {
          ...p,
          task_count: projTasks.length,
          completed_tasks: projTasks.filter((t: { status: string }) => t.status === 'completed').length,
        }
      })
      setProjects(enriched)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useRealtimeTable('projects', user?.tenant_id, fetchProjects)

  const handleOpenDialog = (project?: Project) => {
    setErrors({})
    if (project) {
      setEditingProject(project)
      setFormData({
        name: project.name, description: project.description || '',
        status: project.status, start_date: project.start_date || '', end_date: project.end_date || '',
      })
    } else {
      setEditingProject(null)
      setFormData({ name: '', description: '', status: 'active', start_date: '', end_date: '' })
    }
    setOpenDialog(true)
  }

  const handleSave = async () => {
    const result = projectSchema.safeParse(formData)
    if (!result.success) { setErrors(getValidationErrors(result.error)); return }
    if (!user) return
    setSaving(true); setErrors({})
    try {
      const payload = {
        name: formData.name, description: formData.description || null,
        status: formData.status, start_date: formData.start_date || null, end_date: formData.end_date || null,
      }
      if (editingProject) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editingProject.id)
        if (error) throw error
        showSuccess('Project updated successfully')
      } else {
        const { error } = await supabase.from('projects').insert([{ tenant_id: user.tenant_id, created_by: user.id, ...payload }])
        if (error) throw error
        showSuccess('Project created successfully')
      }
      setOpenDialog(false); fetchProjects()
    } catch (error) {
      showError(getErrorMessage(error))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project and all its tasks?')) return
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      showSuccess('Project deleted'); fetchProjects()
    } catch (error) { showError(getErrorMessage(error)) }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      active: { cls: 'dash-badge-success', label: 'Active' },
      completed: { cls: 'dash-badge-info', label: 'Completed' },
      archived: { cls: 'dash-badge-neutral', label: 'Archived' },
    }
    const s = map[status] || { cls: 'dash-badge-neutral', label: status }
    return <span className={`dash-badge ${s.cls}`}>{s.label}</span>
  }

  const filtered = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const activeCount = projects.filter(p => p.status === 'active').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  return (
    <DashboardShell>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Projects</h1>
          <p className="dash-page-subtitle">Manage and track project progress</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
              <Plus size={16} /> New Project
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
              <DialogDescription>{editingProject ? 'Update project details' : 'Create a new project'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Project Alpha" />
                {errors.name && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.name}</span>}
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v: string) => setFormData({ ...formData, status: v as Project['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="dash-metrics-row">
        <div className="dash-metric-card">
          <div className="dash-metric-header">
            <span className="dash-metric-label">Total Projects</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}><FolderKanban size={16} /></div>
          </div>
          <div className="dash-metric-value">{projects.length}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Active</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}><CheckCircle2 size={16} /></div>
          </div>
          <div className="dash-metric-value">{activeCount}</div>
        </div>
        <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
          <div className="dash-metric-header">
            <span className="dash-metric-label">Archived</span>
            <div className="dash-metric-icon" style={{ background: 'var(--dash-warning-soft)', color: 'var(--dash-warning)' }}><Archive size={16} /></div>
          </div>
          <div className="dash-metric-value">{completedCount}</div>
        </div>
      </div>

      <div className="dash-search-wrap">
        <Search size={16} className="dash-search-icon" />
        <input className="dash-search-input" placeholder="Search projects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="dash-loading">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="dash-empty-state">No projects found. Create your first project!</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(project => {
            const progress = project.task_count ? Math.round(((project.completed_tasks || 0) / project.task_count) * 100) : 0
            return (
              <div key={project.id} className="dash-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dash-text-primary)', marginBottom: 4 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--dash-text-muted)' }}>{project.description || 'No description'}</div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dash-text-muted)', marginBottom: 6 }}>
                    <span>{project.completed_tasks || 0} / {project.task_count || 0} tasks</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="dash-progress">
                    <div className="dash-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {project.start_date && (
                  <div style={{ fontSize: 11, color: 'var(--dash-text-muted)', marginBottom: 12 }}>
                    📅 {project.start_date}{project.end_date ? ` — ${project.end_date}` : ''}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="dash-icon-btn" onClick={() => handleOpenDialog(project)}><Edit2 size={14} /></button>
                  <button className="dash-icon-btn danger" onClick={() => handleDelete(project.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
