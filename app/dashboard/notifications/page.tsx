"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { authApi, notificationsApi } from "@/lib/api-client"
import type { Notification } from "@/types/index"

const EVENT_TYPES = [
  "comment:created",
  "asset:status-changed",
  "asset.activity",
] as const

function sortNotifications(list: Notification[]): Notification[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.getCurrentUser(),
    staleTime: 5 * 60_000,
  })
  const userId = meQuery.data?.id

  const notificationsQuery = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsApi.getAll(userId!),
    enabled: Boolean(userId),
  })

  useEffect(() => {
    if (!userId) {
      return
    }

    const eventSource = new EventSource("/api/events/stream")

    const refetch = () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications", userId],
      })
    }

    eventSource.onopen = refetch
    for (const type of EVENT_TYPES) {
      eventSource.addEventListener(type, refetch)
    }
    eventSource.onerror = refetch

    return () => {
      eventSource.close()
    }
  }, [userId, queryClient])

  const isLoading = meQuery.isLoading || notificationsQuery.isLoading
  const notifications = sortNotifications(notificationsQuery.data ?? [])

  const handleMarkAsRead = async (id: string) => {
    const updated = await notificationsApi.markAsRead(id)
    queryClient.setQueryData<Notification[]>(
      ["notifications", userId],
      (prev) => (prev ?? []).map((n) => (n.id === id ? updated : n)),
    )
  }

  const handleDelete = async (id: string) => {
    await notificationsApi.delete(id)
    queryClient.setQueryData<Notification[]>(
      ["notifications", userId],
      (prev) => (prev ?? []).filter((n) => n.id !== id),
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Notifications" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
      />

      <NotificationCenter
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
      />
    </div>
  )
}
