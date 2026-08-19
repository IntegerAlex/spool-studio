"use client"

import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"
import { useEffect, useRef } from "react"

NProgress.configure({ showSpinner: false, minimum: 0.1, speed: 200 })

export function LoadingBar() {
  const pathname = usePathname()
  const _searchParams = useSearchParams()
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPath.current) {
      NProgress.start()
      const timer = setTimeout(() => NProgress.done(), 300)
      prevPath.current = pathname
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return null
}
