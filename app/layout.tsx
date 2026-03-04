import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/lib/i18n'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: {
    default: 'Workforce Management System',
    template: '%s - Workforce Management',
  },
  description: 'Professional workforce management system for factories and manufacturing facilities',
  keywords: ['workforce', 'management', 'attendance', 'payroll', 'factory', 'workers'],
  authors: [{ name: 'v0' }],
  creator: 'v0',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://workforce.example.com',
    title: 'Workforce Management System',
    description: 'Manage your workforce with ease',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workforce Management System',
    description: 'Manage your workforce with ease',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <LanguageProvider>
          {children}
          <Toaster position="top-right" richColors />
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  )
}
