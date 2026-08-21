"use client"

import { useEffect, useState } from "react"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { authApi, notificationsApi } from "@/lib/api-client"
import type { Notification } from "@/types/index"

const EVENT_TYPES = [
  "comment:created",
  "asset:status-changed",
  "asset.activity",
] as const

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let eventSource: EventSource | null = null

    const sortNotifications = (list: Notification[]) =>
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

    const refetch = async (userId: string) => {
      try {
        const notifs = await notificationsApi.getAll(userId)
        if (!cancelled) setNotifications(sortNotifications(notifs))
      } catch {
        // ignore refetch errors; EventSource will retry the stream
      }
    }

    const loadData = async () => {
      try {
        const user = await authApi.getCurrentUser()
        if (cancelled) return

        if (!user) return

        const notifs = await notificationsApi.getAll(user.id)
        if (cancelled) return
        setNotifications(sortNotifications(notifs))

        eventSource = new EventSource("/api/events/stream")

        eventSource.onopen = () => {
          void refetch(user.id)
        }

        eventSource.addEventListener("notification:created", (e) => {
          try {
            const data = JSON.parse(
              // SAFETY: EventSource 'message' events always carry MessageEvent data payloads.
              (e as MessageEvent).data,
            )
            if (data.userId !== user.id) return

            const incoming: Notification = {
              id: data.id,
              userId: data.userId,
              type: data.type,
              title: data.title,
              message: data.message,
              relatedAssetId: data.relatedAssetId ?? null,
              read: false,
              createdAt: new Date().toISOString(),
            }

            setNotifications((prev) =>
              sortNotifications([incoming, ...prev]),
            )
          } catch {
            // ignore malformed events
          }
        })

        for (const type of EVENT_TYPES) {
          eventSource.addEventListener(type, () => void refetch(user.id))
        }

        eventSource.onerror = () => {
          void refetch(user.id)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
      eventSource?.close()
    }
  }, [])

  const handleMarkAsRead = async (id: string) => {
    const updated = await notificationsApi.markAsRead(id)
    setNotifications(notifications.map((n) => (n.id === id ? updated : n)))
  }

  const handleDelete = async (id: string) => {
    await notificationsApi.delete(id)
    setNotifications(notifications.filter((n) => n.id !== id))
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
