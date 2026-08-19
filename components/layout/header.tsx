"use client"

import { Bell, Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title: string
  className?: string
  user?: AuthUser | null
}

export function Header({ title, className, user = null }: HeaderProps) {
  const pathname = usePathname()

  const displayName = user?.name || user?.email || "User"
  const avatarUrl = user?.avatarUrl
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "CO"

  const routeTitle = (() => {
    if (pathname === "/dashboard" || pathname === "/dashboard/")
      return "Dashboard"
    if (pathname.startsWith("/dashboard/assets/")) return "Asset Details"
    if (pathname.startsWith("/dashboard/assets")) return "Assets"
    if (pathname.startsWith("/dashboard/clients")) return "Clients"
    if (pathname.startsWith("/dashboard/approvals")) return "Approvals"
    if (pathname.startsWith("/dashboard/kanban")) return "Kanban"
    if (pathname.startsWith("/dashboard/queue")) return "Upload Queue"
    if (pathname.startsWith("/dashboard/calendar")) return "Calendar"
    if (pathname.startsWith("/dashboard/settings")) return "Settings"
    return title
  })()

  return (
    <header
      className={cn(
        "fixed left-[240px] right-0 top-0 z-40 hidden items-center justify-between border-b px-6 lg:flex lg:w-[calc(100%-240px)]",
        className,
      )}
      style={{
        height: "57px",
        backgroundColor: "#0f0f0f",
        borderColor: "var(--color-border)",
        boxShadow: "none",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 topbar-breadcrumb">
          <span>Home</span>
          <span className="topbar-breadcrumb-separator">/</span>
          <span className="topbar-breadcrumb-current truncate">
            {routeTitle}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="topbar-search-container hidden md:flex">
          <Search className="topbar-search-icon" />
          <Input placeholder="Search..." className="topbar-search-input" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 topbar-bell"
        >
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <Avatar className="topbar-avatar">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="topbar-avatar-fallback">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
