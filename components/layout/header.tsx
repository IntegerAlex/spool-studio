"use client"

import { Bell, CheckCheck, LogOut, Search, User } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authApi, notificationsApi, searchApi } from "@/lib/api-client"
import type { AuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { Notification, SearchResults } from "@/types/index"

interface HeaderProps {
  title: string
  className?: string
  user?: AuthUser | null
}

const DROPDOWN_PANEL: CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  width: 340,
  backgroundColor: "var(--color-bg-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  zIndex: 50,
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  overflow: "hidden",
}

type OpenMenu = null | "search" | "notifications" | "profile"

export function Header({ title, className, user = null }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = user?.name || user?.email || "User"
  const avatarUrl = user?.avatarUrl
  const initials = useMemo(() => {
    return (
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "CO"
    )
  }, [displayName])

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

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    assets: [],
  })
  const [searching, setSearching] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length
  const totalResults = results.clients.length + results.assets.length

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingNotifications(true)
      try {
        const list = await notificationsApi.getAll()
        if (active) setNotifications(list)
      } catch {
        // Ignore notification load failures.
      } finally {
        if (active) setLoadingNotifications(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!openMenu) return
    const handle = (e: MouseEvent) => {
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [openMenu])

  useEffect(() => {
    if (!query.trim()) {
      setResults({ clients: [], assets: [] })
      return
    }
    const handle = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchApi.search(query)
        setResults(res)
      } catch {
        setResults({ clients: [], assets: [] })
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await notificationsApi.markAsRead(n.id)
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        )
      } catch {
        // Ignore mark-as-read failure.
      }
    }
    setOpenMenu(null)
    if (n.relatedAssetId) router.push(`/dashboard/assets/${n.relatedAssetId}`)
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })))
    } catch {
      // Ignore mark-all failure.
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Proceed to login even if logout request fails.
    }
    window.location.assign("/login")
  }

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

      <div ref={menuRef} className="flex min-w-0 items-center gap-3">
        {/* Search */}
        <div className="topbar-search-container hidden md:flex">
          <Search className="topbar-search-icon" />
          <Input
            placeholder="Search..."
            className="topbar-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpenMenu("search")
            }}
            onFocus={() => setOpenMenu("search")}
          />
          {openMenu === "search" && (
            <div style={DROPDOWN_PANEL}>
              {searching && (
                <div className="px-4 py-6 text-[12.5px] text-[var(--color-text-muted)]">
                  Searching…
                </div>
              )}
              {!searching && totalResults === 0 && (
                <div className="px-4 py-6 text-[12.5px] text-[var(--color-text-muted)]">
                  {query.trim()
                    ? "No matches found."
                    : "Type to search clients and assets."}
                </div>
              )}
              {!searching && totalResults > 0 && (
                <div className="max-h-[360px] overflow-y-auto py-1">
                  {results.clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setOpenMenu(null)
                        router.push(`/dashboard/clients/${c.id}`)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[var(--color-bg-hover)]"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-overlay)] text-[11px] text-white">
                        {c.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-white">
                          {c.name}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                          {c.instagramHandle ? `@${c.instagramHandle}` : c.slug}
                        </span>
                      </span>
                    </button>
                  ))}
                  {results.assets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setOpenMenu(null)
                        router.push(`/dashboard/assets/${a.id}`)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[var(--color-bg-hover)]"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-overlay)] text-[11px] capitalize text-white">
                        {a.type.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-white">
                          {a.title}
                        </span>
                        <span className="block truncate text-[11px] capitalize text-[var(--color-text-muted)]">
                          {a.type}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8 shrink-0 topbar-bell"
            onClick={() =>
              setOpenMenu(openMenu === "notifications" ? null : "notifications")
            }
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f87171] px-1 text-[10px] font-semibold text-black">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {openMenu === "notifications" && (
            <div style={DROPDOWN_PANEL}>
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <span className="text-[13px] font-semibold text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11.5px] text-[var(--color-text-muted)] hover:text-white"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {loadingNotifications && (
                  <div className="px-4 py-6 text-[12.5px] text-[var(--color-text-muted)]">
                    Loading…
                  </div>
                )}
                {!loadingNotifications && notifications.length === 0 && (
                  <div className="px-4 py-6 text-[12.5px] text-[var(--color-text-muted)]">
                    You&apos;re all caught up.
                  </div>
                )}
                {!loadingNotifications &&
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--color-bg-hover)]",
                        !n.read && "bg-[rgba(62,207,142,0.05)]",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {!n.read && (
                          <span className="size-1.5 shrink-0 rounded-full bg-[#3ecf8e]" />
                        )}
                        <span className="truncate text-[13px] font-medium text-white">
                          {n.title}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-[11.5px] text-[var(--color-text-muted)]">
                        {n.message}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu(openMenu === "profile" ? null : "profile")
            }
            className="rounded-full"
            aria-label="Open profile menu"
          >
            <Avatar className="topbar-avatar">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="topbar-avatar-fallback">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          {openMenu === "profile" && (
            <div style={{ ...DROPDOWN_PANEL, width: 240 }}>
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <p className="truncate text-[13px] font-semibold text-white">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="truncate text-[11.5px] text-[var(--color-text-muted)]">
                    {user.email}
                  </p>
                )}
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-white"
                >
                  <User className="h-4 w-4" /> Profile &amp; settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-[#f87171] hover:bg-[var(--color-bg-hover)]"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
