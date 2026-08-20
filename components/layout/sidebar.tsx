"use client"

import { BarChart3, Calendar, CheckSquare, ClipboardList, Image as ImageIcon, LayoutList, LogOut, Settings, Upload, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { AuthUser } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigationSections = [
  {
    title: "WORKSPACE",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
      },
      {
        label: "Clients",
        href: "/dashboard/clients",
        icon: Users,
      },
      {
        label: "Planner",
        href: "/dashboard/planner",
        icon: LayoutList,
      },
      {
        label: "Assets",
        href: "/dashboard/assets",
        icon: ImageIcon,
      },
    ],
  },
  {
    title: "WORKFLOW",
    items: [
      {
        label: "Approvals",
        href: "/dashboard/approvals",
        icon: CheckSquare,
      },
      {
        label: "Kanban",
        href: "/dashboard/kanban",
        icon: BarChart3,
      },
      {
        label: "Upload Queue",
        href: "/dashboard/queue",
        icon: Upload,
      },
      {
        label: "Calendar",
        href: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        label: "Logs",
        href: "/dashboard/logs",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
]

interface SidebarLayoutProps {
  user?: AuthUser | null
}

export function SidebarLayout({ user = null }: SidebarLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  const displayName = useMemo(() => {
    return user?.name || user?.email?.split("@")[0] || "User"
  }, [user])

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

  const userRole = useMemo(() => {
    const rawRole = user?.role
    if (rawRole) {
      return rawRole.charAt(0).toUpperCase() + rawRole.slice(1)
    }
    if (user?.email?.includes("admin")) return "Administrator"
    return "Agency Partner"
  }, [user])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon" className="bg-[#0f0f0f]">
      <SidebarHeader className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/asset_flow.png"
                alt="Asset Flow"
                width={260}
                height={78}
                priority
                className="h-10 w-auto shrink-0 object-contain group-data-[collapsible=icon]:h-7"
              />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-1">
        {navigationSections.map((section) => (
          <SidebarGroup key={section.title} className="py-1">
            <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">
              {section.title}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={
                        isActive
                          ? "bg-[var(--color-bg-active)] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-active)] data-[active=true]:bg-[var(--color-bg-active)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                      }
                    >
                      <Link href={item.href}>
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--color-text-primary)]" : "opacity-70"}`} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-[rgba(255,255,255,0.06)] px-3 py-2 group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <Avatar className="h-9 w-9 shrink-0 border border-[rgba(255,255,255,0.08)] group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-[var(--color-bg-overlay)] text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{displayName}</p>
                <p className="truncate text-[11px] text-[var(--color-text-faint)]">{userRole}</p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-center gap-2 border border-[var(--color-border)] text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
