'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import {
    Building2,
    Briefcase,
    User,
    ChevronRight,
    Check,
} from 'lucide-react'
import '@/app/dashboard.css'

interface Department {
    id: string
    name: string
}

export default function OnboardingPage() {
    const { user } = useUser()
    const router = useRouter()
    const { t } = useLanguage()
    const [step, setStep] = useState(1)
    const [departments, setDepartments] = useState<Department[]>([])
    const [formData, setFormData] = useState({
        department: '',
        employment_type: 'full_time' as string,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        start_date: new Date().toISOString().split('T')[0],
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // If already onboarded, redirect
    useEffect(() => {
        if (user && user.onboarding_completed) {
            router.replace('/protected/worker-dashboard')
        }
    }, [user, router])

    // Fetch departments
    useEffect(() => {
        const fetchDepts = async () => {
            if (!user) return
            const supabase = createClient()
            const { data } = await supabase
                .from('departments')
                .select('id, name')
                .eq('tenant_id', user.tenant_id)
                .order('name')
            setDepartments(data || [])
        }
        fetchDepts()
    }, [user])

    // Pre-fill from user data
    useEffect(() => {
        if (user) {
            const nameParts = (user.full_name || '').split(' ')
            setFormData(prev => ({
                ...prev,
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                email: user.email || '',
                phone: user.phone || '',
            }))
        }
    }, [user])

    const handleSubmit = async () => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            // First, activate user and mark onboarding as completed
            // This must happen first so RLS policies allow subsequent operations
            const { error: userError } = await supabase
                .from('users')
                .update({ onboarding_completed: true, is_active: true })
                .eq('id', user.id)

            if (userError) throw userError

            // Check if worker profile already exists for this user
            const { data: existingWorker } = await supabase
                .from('workers')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (existingWorker) {
                // Update existing worker profile
                const { error: updateError } = await supabase
                    .from('workers')
                    .update({
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        email: formData.email,
                        phone: formData.phone,
                        employment_type: formData.employment_type,
                        department: formData.department,
                        hire_date: formData.start_date,
                        is_active: true,
                    })
                    .eq('id', existingWorker.id)

                if (updateError) throw updateError
            } else {
                // Create new worker profile
                const empId = 'EMP' + Date.now().toString().slice(-6)
                const { error: workerError } = await supabase
                    .from('workers')
                    .insert({
                        tenant_id: user.tenant_id,
                        user_id: user.id,
                        employee_id: empId,
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        email: formData.email,
                        phone: formData.phone,
                        employment_type: formData.employment_type,
                        department: formData.department,
                        hire_date: formData.start_date,
                        is_active: true,
                    })

                if (workerError) throw workerError
            }

            // Force refresh and navigate
            window.location.href = '/protected/worker-dashboard'
        } catch (err: any) {
            console.error('[Onboarding] Error:', JSON.stringify(err, null, 2))
            let message = 'An error occurred'
            if (err?.message) {
                message = err.message
            } else if (err?.code) {
                message = `Database error: ${err.code} - ${err.details || err.hint || 'Unknown error'}`
            } else if (err?.statusCode) {
                message = `Error ${err.statusCode}: ${err.name || 'Request failed'}`
            } else if (typeof err === 'object') {
                message = JSON.stringify(err)
            } else if (typeof err === 'string') {
                message = err
            }
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const employmentTypes = [
        { value: 'full_time', label: t('onboarding.fullTime'), icon: '🕐' },
        { value: 'part_time', label: t('onboarding.partTime'), icon: '⏰' },
        { value: 'freelance', label: t('onboarding.freelance'), icon: '💼' },
    ]

    const stepTitles = [
        t('onboarding.step1Title'),
        t('onboarding.step2Title'),
    ]

    return (
        <DashboardShell>
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
                {/* Progress Steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
                    {[1, 2].map((s) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: step >= s ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(255,255,255,0.08)',
                                color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontSize: 13, fontWeight: 700,
                                transition: 'all 0.3s ease',
                            }}>
                                {step > s ? <Check size={16} /> : s}
                            </div>
                            <span style={{
                                fontSize: 13, fontWeight: 500,
                                color: step >= s ? 'var(--dash-text-primary)' : 'var(--dash-text-muted)',
                            }}>
                                {stepTitles[s - 1]}
                            </span>
                            {s < 2 && (
                                <div style={{
                                    flex: 1, height: 2,
                                    background: step > s ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                    transition: 'background 0.3s ease',
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Department & Employment Type */}
                {step === 1 && (
                    <div className="dash-card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dash-text-primary)', marginBottom: 4 }}>
                            {t('onboarding.selectDepartment')}
                        </h2>
                        <p style={{ fontSize: 13, color: 'var(--dash-text-muted)', marginBottom: 24 }}>
                            {t('onboarding.step1Desc')}
                        </p>

                        {/* Department Selection */}
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 8, display: 'block' }}>
                            {t('onboarding.department')}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                            {departments.length > 0 ? departments.map((dept) => (
                                <button
                                    key={dept.id}
                                    onClick={() => setFormData(p => ({ ...p, department: dept.name }))}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 12,
                                        border: formData.department === dept.name
                                            ? '2px solid #6366f1'
                                            : '1px solid rgba(255,255,255,0.1)',
                                        background: formData.department === dept.name
                                            ? 'rgba(99, 102, 241, 0.15)'
                                            : 'rgba(255,255,255,0.04)',
                                        color: formData.department === dept.name ? '#818cf8' : 'var(--dash-text-primary)',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <Building2 size={14} style={{ marginRight: 6, display: 'inline' }} />
                                    {dept.name}
                                </button>
                            )) : (
                                <input
                                    className="dash-search-input"
                                    placeholder={t('onboarding.typeDepartment')}
                                    value={formData.department}
                                    onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                                    style={{ width: '100%' }}
                                />
                            )}
                        </div>

                        {/* Employment Type */}
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 8, display: 'block' }}>
                            {t('onboarding.employmentType')}
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {employmentTypes.map((et) => (
                                <button
                                    key={et.value}
                                    onClick={() => setFormData(p => ({ ...p, employment_type: et.value }))}
                                    style={{
                                        flex: 1,
                                        padding: '16px 12px',
                                        borderRadius: 12,
                                        border: formData.employment_type === et.value
                                            ? '2px solid #6366f1'
                                            : '1px solid rgba(255,255,255,0.1)',
                                        background: formData.employment_type === et.value
                                            ? 'rgba(99, 102, 241, 0.15)'
                                            : 'rgba(255,255,255,0.04)',
                                        color: 'var(--dash-text-primary)',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ fontSize: 20, marginBottom: 6 }}>{et.icon}</div>
                                    {et.label}
                                </button>
                            ))}
                        </div>

                        <button
                            className="dash-btn dash-btn-accent"
                            style={{ width: '100%', marginTop: 24 }}
                            onClick={() => {
                                if (!formData.department) {
                                    setError(t('onboarding.selectDeptRequired'))
                                    return
                                }
                                setError(null)
                                setStep(2)
                            }}
                        >
                            {t('common.continue')} <ChevronRight size={16} />
                        </button>

                        {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{error}</div>}
                    </div>
                )}

                {/* Step 2: Personal Details */}
                {step === 2 && (
                    <div className="dash-card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--dash-text-primary)', marginBottom: 4 }}>
                            {t('onboarding.personalDetails')}
                        </h2>
                        <p style={{ fontSize: 13, color: 'var(--dash-text-muted)', marginBottom: 24 }}>
                            {t('onboarding.step2Desc')}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 6, display: 'block' }}>
                                    {t('workers.firstName')} *
                                </label>
                                <input
                                    className="dash-search-input"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                                    placeholder="John"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 6, display: 'block' }}>
                                    {t('workers.lastName')} *
                                </label>
                                <input
                                    className="dash-search-input"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                                    placeholder="Doe"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 6, display: 'block' }}>
                                    {t('workers.email')}
                                </label>
                                <input
                                    className="dash-search-input"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                    placeholder="john@example.com"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 6, display: 'block' }}>
                                    {t('workers.phone')}
                                </label>
                                <input
                                    className="dash-search-input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="+977-9800000000"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-secondary)', marginBottom: 6, display: 'block' }}>
                                {t('onboarding.startDate')}
                            </label>
                            <input
                                className="dash-search-input"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 12, textAlign: 'center' }}>{error}</div>}

                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button
                                className="dash-btn"
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.08)',
                                    color: 'var(--dash-text-primary)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}
                                onClick={() => setStep(1)}
                            >
                                {t('common.back')}
                            </button>
                            <button
                                className="dash-btn dash-btn-accent"
                                style={{ flex: 2 }}
                                onClick={() => {
                                    if (!formData.first_name || !formData.last_name) {
                                        setError(t('onboarding.nameRequired'))
                                        return
                                    }
                                    handleSubmit()
                                }}
                                disabled={loading}
                            >
                                {loading ? t('common.loading') : t('onboarding.completeSetup')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    )
}
