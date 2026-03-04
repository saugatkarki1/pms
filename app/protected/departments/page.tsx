'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n'
import { formatNPR } from '@/lib/currency'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import {
    Building2,
    Plus,
    Users,
    ChevronRight,
    ChevronDown,
    Search,
    Edit2,
    Trash2,
} from 'lucide-react'
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
import '@/app/dashboard.css'

interface Department {
    id: string
    name: string
    description: string | null
    tenant_id: string
}

interface WorkerRecord {
    id: string
    first_name: string
    last_name: string
    email: string | null
    employment_type: string
    department: string | null
    salary_per_month: number | null
    is_active: boolean
}

export default function DepartmentsPage() {
    const { user } = useUser()
    const router = useRouter()
    const { t } = useLanguage()
    const [departments, setDepartments] = useState<Department[]>([])
    const [workers, setWorkers] = useState<WorkerRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedDept, setExpandedDept] = useState<string | null>(null)
    const [openDialog, setOpenDialog] = useState(false)
    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [formData, setFormData] = useState({ name: '', description: '' })
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    const fetchData = async () => {
        if (!user) return
        try {
            const { data: depts } = await supabase
                .from('departments')
                .select('*')
                .eq('tenant_id', user.tenant_id)
                .order('name')

            const { data: workersData } = await supabase
                .from('workers')
                .select('id, first_name, last_name, email, employment_type, department, salary_per_month, is_active')
                .eq('tenant_id', user.tenant_id)
                .order('first_name')

            setDepartments(depts || [])
            setWorkers(workersData || [])
        } catch (error) {
            console.error('[Departments] Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [user])

    const getWorkerCount = (deptName: string) =>
        workers.filter(w => w.department === deptName).length

    const getDeptWorkers = (deptName: string) =>
        workers.filter(w => w.department === deptName)

    const getTotalSalary = (deptName: string) =>
        getDeptWorkers(deptName).reduce((sum, w) => sum + (w.salary_per_month || 0), 0)

    const handleOpenDialog = (dept?: Department) => {
        if (dept) {
            setEditingDept(dept)
            setFormData({ name: dept.name, description: dept.description || '' })
        } else {
            setEditingDept(null)
            setFormData({ name: '', description: '' })
        }
        setOpenDialog(true)
    }

    const handleSave = async () => {
        if (!user || !formData.name.trim()) return
        try {
            if (editingDept) {
                await supabase
                    .from('departments')
                    .update({ name: formData.name, description: formData.description || null })
                    .eq('id', editingDept.id)
            } else {
                await supabase
                    .from('departments')
                    .insert({ tenant_id: user.tenant_id, name: formData.name, description: formData.description || null })
            }
            setOpenDialog(false)
            fetchData()
        } catch (error) {
            console.error('[Departments] Save error:', error)
        }
    }

    const handleDelete = async (deptId: string) => {
        if (!confirm('Are you sure you want to delete this department?')) return
        try {
            await supabase.from('departments').delete().eq('id', deptId)
            fetchData()
        } catch (error) {
            console.error('[Departments] Delete error:', error)
        }
    }

    const filteredDepts = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const deptIcons: Record<string, string> = {
        'Engineering': '⚙️', 'Operations': '📦', 'Marketing': '📣', 'Finance': '💰',
        'Sales': '📈', 'HR': '👥', 'IT': '💻', 'Production': '🏭', 'Warehouse': '📦',
        'Logistics': '🚚', 'Support': '🎧',
    }

    return (
        <DashboardShell>
            {/* Page Header */}
            <div className="dash-page-header">
                <div>
                    <h1 className="dash-page-title">{t('departments.title')}</h1>
                    <p className="dash-page-subtitle">{t('departments.subtitle')}</p>
                </div>
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <button className="dash-btn dash-btn-accent" onClick={() => handleOpenDialog()}>
                            <Plus size={16} /> {t('departments.addDepartment')}
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingDept ? t('departments.editDepartment') : t('departments.addDepartment')}</DialogTitle>
                            <DialogDescription>
                                {editingDept ? t('departments.editDesc') : t('departments.addDesc')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>{t('departments.name')}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Engineering"
                                />
                            </div>
                            <div>
                                <Label>{t('departments.description')}</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Software development team"
                                />
                            </div>
                            <button className="dash-btn dash-btn-accent" style={{ width: '100%' }} onClick={handleSave}>
                                {editingDept ? t('common.update') : t('common.create')}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Metrics */}
            <div className="dash-metrics-row">
                <div className="dash-metric-card">
                    <div className="dash-metric-header">
                        <span className="dash-metric-label">{t('departments.totalDepartments')}</span>
                        <div className="dash-metric-icon" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>
                            <Building2 size={16} />
                        </div>
                    </div>
                    <div className="dash-metric-value">{departments.length}</div>
                    <div className="dash-metric-detail">{t('departments.activeDepartments')}</div>
                </div>
                <div className="dash-metric-card" style={{ animationDelay: '0.1s' }}>
                    <div className="dash-metric-header">
                        <span className="dash-metric-label">{t('workers.totalWorkers')}</span>
                        <div className="dash-metric-icon" style={{ background: 'var(--dash-success-soft)', color: 'var(--dash-success)' }}>
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="dash-metric-value">{workers.length}</div>
                    <div className="dash-metric-detail">{t('departments.acrossAllDepts')}</div>
                </div>
                <div className="dash-metric-card" style={{ animationDelay: '0.2s' }}>
                    <div className="dash-metric-header">
                        <span className="dash-metric-label">{t('departments.avgPerDept')}</span>
                        <div className="dash-metric-icon" style={{ background: 'var(--dash-warning-soft)', color: 'var(--dash-warning)' }}>
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="dash-metric-value">
                        {departments.length > 0 ? Math.round(workers.length / departments.length) : 0}
                    </div>
                    <div className="dash-metric-detail">{t('departments.averageWorkers')}</div>
                </div>
            </div>

            {/* Search */}
            <div className="dash-search-wrap">
                <Search size={16} className="dash-search-icon" />
                <input
                    className="dash-search-input"
                    placeholder={t('departments.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Departments List */}
            <div className="dash-table-card">
                <div className="dash-table-header">
                    <div className="dash-table-title">{t('departments.title')}</div>
                    <div className="dash-table-subtitle">{filteredDepts.length} department(s)</div>
                </div>
                <div className="dash-table-body">
                    {loading ? (
                        <div className="dash-loading">{t('common.loading')}</div>
                    ) : filteredDepts.length === 0 ? (
                        <div className="dash-empty-state">{t('departments.noDepartments')}</div>
                    ) : (
                        filteredDepts.map((dept) => {
                            const isExpanded = expandedDept === dept.id
                            const deptWorkers = getDeptWorkers(dept.name)
                            const workerCount = deptWorkers.length

                            return (
                                <div key={dept.id} style={{ borderBottom: '1px solid var(--dash-border)' }}>
                                    {/* Department Row */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '16px 20px',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12,
                                            background: 'rgba(99, 102, 241, 0.1)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                            marginRight: 16,
                                        }}>
                                            {deptIcons[dept.name] || '🏢'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)' }}>
                                                {dept.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--dash-text-muted)' }}>
                                                {dept.description || t('departments.noDescription')}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <span className="dash-badge dash-badge-neutral">{workerCount} {t('common.employees')}</span>
                                            <span style={{ fontSize: 11, color: 'var(--dash-text-muted)' }}>
                                                {formatNPR(getTotalSalary(dept.name), false)}
                                            </span>
                                            <div className="dash-table-actions" onClick={(e) => e.stopPropagation()}>
                                                <button className="dash-icon-btn" onClick={() => handleOpenDialog(dept)}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="dash-icon-btn danger" onClick={() => handleDelete(dept.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--dash-text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--dash-text-muted)' }} />}
                                        </div>
                                    </div>

                                    {/* Expanded Worker List */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '0 20px 16px 72px',
                                            animation: 'dashCardIn 0.2s ease',
                                        }}>
                                            {deptWorkers.length === 0 ? (
                                                <div style={{ fontSize: 12, color: 'var(--dash-text-muted)', padding: '8px 0' }}>
                                                    {t('departments.noWorkers')}
                                                </div>
                                            ) : (
                                                <table className="dash-table" style={{ fontSize: 12 }}>
                                                    <thead>
                                                        <tr>
                                                            <th>{t('workers.name')}</th>
                                                            <th>{t('workers.email')}</th>
                                                            <th>{t('workers.type')}</th>
                                                            <th>{t('workers.salary')}</th>
                                                            <th>{t('common.status')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {deptWorkers.map((w) => (
                                                            <tr key={w.id}>
                                                                <td style={{ fontWeight: 500 }}>{w.first_name} {w.last_name}</td>
                                                                <td style={{ color: 'var(--dash-text-muted)' }}>{w.email || '—'}</td>
                                                                <td>
                                                                    <span className="dash-badge dash-badge-neutral" style={{ textTransform: 'capitalize' }}>
                                                                        {w.employment_type.replace('_', ' ')}
                                                                    </span>
                                                                </td>
                                                                <td>{w.salary_per_month ? formatNPR(w.salary_per_month, false) : '—'}</td>
                                                                <td>
                                                                    <span className={`dash-badge ${w.is_active ? 'dash-badge-success' : 'dash-badge-warning'}`}>
                                                                        {w.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </DashboardShell>
    )
}
