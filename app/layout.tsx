import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'
import PerfClient from '@/components/perf/client-perf'
import { SWRProvider } from '@/lib/swr-config'
import { LoadingBar } from '@/components/layout/loading-bar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Content Ops Pro - Content Management Platform',
  description: 'Professional content operations platform for managing Instagram reels, approvals, and team collaboration',
  generator: 'v0.app',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="en" className="bg-background text-foreground">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <SWRProvider>
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          <div className="global-loader-overlay">
            <div className="global-loader-content">
              <div className="global-loader-logo">AF</div>
              <div className="global-loader-bar-container">
                <div className="global-loader-bar-fill"></div>
              </div>
              <div className="global-loader-text">Loading your workspace...</div>
            </div>
          </div>
          {children}
          <Toaster />
        </SWRProvider>
        {process.env.NEXT_PUBLIC_PERF_DIAG === '1' && <PerfClient />}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
