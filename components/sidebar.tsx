'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Users, Clock, DollarSign, Package, BarChart3, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as AuthUser } from '@/lib/auth'

interface SidebarProps {
  user: AuthUser | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const handleLogout = async () => {
    const supabase = createClient()
    await fetch('/api/clear-2fa', { method: 'POST' })
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const allMenuItems = [
    { href: '/protected', icon: BarChart3, label: 'Dashboard', roles: ['owner'] },
    { href: '/protected/admin-dashboard', icon: BarChart3, label: 'Dashboard', roles: ['admin'] },
    { href: '/protected/worker-dashboard', icon: BarChart3, label: 'Dashboard', roles: ['worker'] },
    { href: '/protected/workers', icon: Users, label: 'Workers', roles: ['owner', 'admin'] },
    { href: '/protected/attendance', icon: Clock, label: 'Attendance', roles: ['owner', 'admin', 'worker'] },
    { href: '/protected/payroll', icon: DollarSign, label: 'Payroll', roles: ['owner', 'admin', 'worker'] },
    { href: '/protected/inventory', icon: Package, label: 'Inventory', roles: ['owner', 'admin'] },
    { href: '/protected/reports', icon: BarChart3, label: 'Reports', roles: ['owner', 'admin'] },
    { href: '/protected/settings', icon: Settings, label: 'Settings', roles: ['owner'] },
  ]

  const menuItems = allMenuItems.filter(item => user && item.roles.includes(user.role))

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Logo Section */}
      <div className="border-b border-sidebar-border p-6">
        <h1 className="text-xl font-bold">WorkForce</h1>
        <p className="text-xs text-sidebar-foreground/60">Management System</p>
      </div>

      {/* User Info Section */}
      {user && (
        <div className="border-b border-sidebar-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.full_name || user.email}</p>
              <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout Section */}
      <div className="border-t border-sidebar-border p-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
