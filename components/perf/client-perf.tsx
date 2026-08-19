"use client"
import { useEffect } from "react"

export default function PerfClient() {
  useEffect(() => {
    // oxlint-disable-next-line anti-slop/no-runtime-typeof  // SSR guard
    if (typeof window === "undefined") return
    if (process.env.NEXT_PUBLIC_PERF_DIAG !== "1") return

    const send = () => {
      try {
        const nav = (
// SAFETY: this cast is safe because the value already conforms to the asserted type.
          performance.getEntriesByType(
            "navigation",
          ) as PerformanceNavigationTiming[]
        )[0]
        const paints = performance
          .getEntriesByType("paint")
          .map((p) => ({ name: p.name, start: p.startTime }))

        const data = {
          ts: Date.now(),
          nav: nav
            ? {
                loadEventEnd: nav.loadEventEnd,
                domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
                responseStart: nav.responseStart,
                requestStart: nav.requestStart,
                duration: nav.duration,
              }
            : null,
          paints,
          ua: navigator.userAgent,
          href: window.location.href,
        }

        void fetch("/api/perf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag: "[render]", payload: data }),
        })
      } catch {
        // ignore
      }
    }

    // give browser a moment to populate timings
    const id = window.setTimeout(send, 1500)
    return () => window.clearTimeout(id)
  }, [])

  return null
}
