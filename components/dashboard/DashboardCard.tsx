'use client'

import type { ReactNode } from 'react'

interface DashboardCardProps {
    title: string
    subtitle?: string
    icon?: ReactNode
    iconBg?: string
    children: ReactNode
    className?: string
    animationDelay?: number
}

export function DashboardCard({
    title,
    subtitle,
    icon,
    iconBg = 'var(--dash-accent-soft)',
    children,
    className = '',
    animationDelay = 0,
}: DashboardCardProps) {
    return (
        <div
            className={`dash-card ${className}`}
            style={{ animationDelay: `${animationDelay}s` }}
        >
            <div className="dash-card-header">
                <div>
                    <h3 className="dash-card-title">{title}</h3>
                    {subtitle && <p className="dash-card-subtitle">{subtitle}</p>}
                </div>
                {icon && (
                    <div className="dash-card-icon" style={{ background: iconBg, color: iconBg === 'var(--dash-accent-soft)' ? 'var(--dash-accent)' : undefined }}>
                        {icon}
                    </div>
                )}
            </div>
            <div className="dash-card-body">{children}</div>
        </div>
    )
}
