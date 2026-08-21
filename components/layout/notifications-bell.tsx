"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { notificationsApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/index"

interface NotificationsBellProps {
  userId?: string
}

export function NotificationsBell({ userId }: NotificationsBellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Shares the ["notifications", userId] cache with /dashboard/notifications.
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsApi.getAll(userId!),
    enabled: Boolean(userId),
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const patchCache = (updater: (prev: Notification[]) => Notification[]) => {
    queryClient.setQueryData<Notification[]>(
      ["notifications", userId],
      (prev) => updater(prev ?? []),
    )
  }

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        const updated = await notificationsApi.markAsRead(n.id)
        patchCache((prev) =>
          prev.map((x) => (x.id === n.id ? updated : x)),
        )
      } catch {
        // Ignore mark-as-read failure.
      }
    }
    if (n.relatedAssetId) {
      router.push(`/dashboard/assets/${n.relatedAssetId}`)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      patchCache((prev) => prev.map((x) => ({ ...x, read: true })))
    } catch {
      // Ignore mark-all failure.
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f87171] px-1 text-[10px] font-semibold text-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
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
          {isLoading && (
            <div className="px-4 py-6 text-[12.5px] text-[var(--color-text-muted)]">
              Loading…
            </div>
          )}
          {!isLoading && notifications.length === 0 && (
            <div className="px-4 py-6 text-[12.5px] text-[var(--color-text-muted)]">
              You&apos;re all caught up.
            </div>
          )}
          {!isLoading &&
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
        <div className="border-t border-[var(--color-border)] px-4 py-2.5">
          <Link
            href="/dashboard/notifications"
            className="block text-center text-[12px] text-[var(--color-text-muted)] hover:text-white"
          >
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
