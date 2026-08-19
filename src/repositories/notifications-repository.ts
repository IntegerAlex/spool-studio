import { getPool } from "@/lib/db"
import { emitEvent } from "@/lib/event-bus"

export interface NotificationRow {
  id: string
  user_id: string | null
  type: string
  title: string
  message: string
  related_asset_id: string | null
  read: boolean
  created_at: string
}

export async function listNotifications(
  userId: string,
): Promise<NotificationRow[]> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, message, related_asset_id, read, created_at
     FROM notifications
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId],
  )
  return rows
}

export async function getNotificationById(
  notificationId: string,
): Promise<NotificationRow | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, message, related_asset_id, read, created_at
     FROM notifications WHERE id = $1`,
    [notificationId],
  )
  return rows[0] ?? null
}

export async function createNotification(input: {
  userId: string | null
  type: string
  title: string
  message: string
  relatedAssetId?: string | null
}): Promise<NotificationRow> {
  const pool = getPool()
  const id = crypto.randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, message, related_asset_id, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
     RETURNING id, user_id, type, title, message, related_asset_id, read, created_at`,
    [
      id,
      input.userId,
      input.type,
      input.title,
      input.message,
      input.relatedAssetId ?? null,
    ],
  )

  const notification = rows[0]

  emitEvent({
    type: "notification:created",
    payload: {
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedAssetId: notification.related_asset_id,
    },
  })

  return notification
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<void> {
  const pool = getPool()
  await pool.query("UPDATE notifications SET read = true WHERE id = $1", [
    notificationId,
  ])
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  const pool = getPool()
  await pool.query(
    "UPDATE notifications SET read = true WHERE user_id = $1 OR user_id IS NULL",
    [userId],
  )
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const pool = getPool()
  await pool.query("DELETE FROM notifications WHERE id = $1", [notificationId])
}
