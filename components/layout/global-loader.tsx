"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"

export function GlobalLoader() {
  const pathname = usePathname()
  // Marketing landing page loads clean — no loader.
  if (pathname === "/") return null

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-content">
        <Image
          src="/Spool_logo.png"
          alt="Spool Studio"
          width={72}
          height={72}
          priority
          className="global-loader-logo"
          style={{ height: "auto" }}
        />
        <div className="global-loader-bar-container">
          <div className="global-loader-bar-fill"></div>
        </div>
        <div className="global-loader-text">Loading your workspace...</div>
      </div>
    </div>
  )
}
