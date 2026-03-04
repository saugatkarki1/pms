'use client'

import { useLanguage } from '@/lib/i18n'
import { Globe } from 'lucide-react'

interface LanguageToggleProps {
    variant?: 'sidebar' | 'auth'
}

export function LanguageToggle({ variant = 'sidebar' }: LanguageToggleProps) {
    const { language, setLanguage } = useLanguage()

    const toggle = () => setLanguage(language === 'en' ? 'ne' : 'en')

    if (variant === 'sidebar') {
        return (
            <button
                className="dash-sidebar-item"
                onClick={toggle}
                title={language === 'en' ? 'नेपालीमा बदल्नुहोस्' : 'Switch to English'}
                style={{ fontSize: 12, fontWeight: 600 }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Globe size={18} />
                    <span style={{ fontSize: 9, letterSpacing: '0.5px' }}>
                        {language === 'en' ? 'ने' : 'EN'}
                    </span>
                </div>
            </button>
        )
    }

    // Auth variant — inline toggle
    return (
        <button
            onClick={toggle}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 9999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
        >
            <Globe size={14} />
            {language === 'en' ? 'नेपाली' : 'English'}
        </button>
    )
}
