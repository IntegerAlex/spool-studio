import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import Image from "next/image"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { LoadingBar } from "@/components/layout/loading-bar"
import PerfClient from "@/components/perf/client-perf"
import { QueryProvider } from "@/lib/query-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spool Studio - Content Management Platform",
  description:
    "Professional content operations platform for managing Instagram reels, approvals, and team collaboration",
  generator: "v0.app",
  icons: {
    icon: "/Spool_logo.png",
    apple: "/Spool_logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
      >
        <QueryProvider>
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          <div className="global-loader-overlay">
            <div className="global-loader-content">
              <Image src="/Spool_logo.png" alt="Spool Studio" width={72} height={72} priority className="global-loader-logo" />
              <div className="global-loader-bar-container">
                <div className="global-loader-bar-fill"></div>
              </div>
              <div className="global-loader-text">
                Loading your workspace...
              </div>
            </div>
          </div>
          {children}
          <Toaster />
        </QueryProvider>
        {process.env.NEXT_PUBLIC_PERF_DIAG === "1" && <PerfClient />}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
