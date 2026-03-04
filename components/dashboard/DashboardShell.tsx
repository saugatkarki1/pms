'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useLanguage } from '@/lib/i18n'
import { LanguageToggle } from '@/components/LanguageToggle'
import {
    LayoutDashboard,
    Users,
    Clock,
    DollarSign,
    Package,
    BarChart3,
    Settings,
    LogOut,
    Bell,
    Building2,
} from 'lucide-react'

interface DashboardShellProps {
    statusPills?: React.ReactNode
    heroPanel?: React.ReactNode
    rightPanel?: React.ReactNode
    bottomCards?: React.ReactNode
    fourColBottom?: boolean
    children?: React.ReactNode
}

const navItems = [
    { href: '/protected', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner'] },
    { href: '/protected/admin-dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
    { href: '/protected/worker-dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['worker'] },
    { href: '/protected/workers', icon: Users, label: 'Workers', roles: ['owner', 'admin'] },
    { href: '/protected/departments', icon: Building2, label: 'Departments', roles: ['owner', 'admin'] },
    { href: '/protected/attendance', icon: Clock, label: 'Attendance', roles: ['owner', 'admin', 'worker'] },
    { href: '/protected/payroll', icon: DollarSign, label: 'Payroll', roles: ['owner', 'admin', 'worker'] },
    { href: '/protected/inventory', icon: Package, label: 'Inventory', roles: ['owner', 'admin'] },
    { href: '/protected/reports', icon: BarChart3, label: 'Reports', roles: ['owner', 'admin'] },
]

const bottomItems = [
    { href: '/protected/settings', icon: Settings, label: 'Settings', roles: ['owner', 'admin'] },
]

export function DashboardShell({
    statusPills,
    heroPanel,
    rightPanel,
    bottomCards,
    fourColBottom = false,
    children,
}: DashboardShellProps) {
    const { user } = useUser()
    const { t } = useLanguage()
    const pathname = usePathname()
    const router = useRouter()

    const isActive = (path: string) => {
        if (path === '/protected') return pathname === '/protected'
        return pathname === path || pathname.startsWith(path + '/')
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await fetch('/api/clear-2fa', { method: 'POST' })
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    const filteredNav = navItems.filter(
        (item) => user && item.roles.includes(user.role)
    )
    const filteredBottom = bottomItems.filter(
        (item) => user && item.roles.includes(user.role)
    )

    const isDashboardMode = !!(heroPanel || rightPanel || bottomCards)

    return (
        <div className="dash-master">
            <div className="dash-container">
                {/* Dark Icon Sidebar */}
                <aside className="dash-sidebar">
                    <div className="dash-sidebar-logo">W</div>

                    <span className="dash-sidebar-section-label">{t('nav.main')}</span>
                    <nav className="dash-sidebar-nav">
                        {filteredNav.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`dash-sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                                    title={item.label}
                                >
                                    <Icon size={20} />
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="dash-sidebar-bottom">
                        <span className="dash-sidebar-section-label">{t('nav.settings')}</span>
                        {filteredBottom.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`dash-sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                                    title={item.label}
                                >
                                    <Icon size={20} />
                                </Link>
                            )
                        })}
                        <LanguageToggle variant="sidebar" />
                        <button
                            className="dash-sidebar-item"
                            onClick={handleLogout}
                            title={t('nav.logout')}
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="dash-main">
                    {isDashboardMode ? (
                        <>
                            {/* Status Strip */}
                            {statusPills && (
                                <div className="dash-status-strip">{statusPills}</div>
                            )}

                            {/* Top Grid: Hero + Right */}
                            <div className="dash-grid-top">
                                {heroPanel}
                                {rightPanel}
                            </div>

                            {/* Bottom Grid: Cards */}
                            <div className={`dash-grid-bottom ${fourColBottom ? 'four-cols' : ''}`}>
                                {bottomCards}
                            </div>
                        </>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    )
}
