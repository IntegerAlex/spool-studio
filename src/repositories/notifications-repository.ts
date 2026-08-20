import { and, desc, eq, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import { notifications } from "@/db/schema"
import { emitEvent } from "@/lib/event-bus"

export type NotificationRow = typeof notifications.$inferSelect

export async function listNotifications(
  userId: string,
): Promise<NotificationRow[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(or(eq(notifications.user_id, userId), isNull(notifications.user_id)))
    .orderBy(desc(notifications.created_at))
    .limit(50)
  return rows
}

export async function getNotificationById(
  notificationId: string,
): Promise<NotificationRow | null> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1)
  return rows[0] ?? null
}

export async function createNotification(input: {
  userId: string | null
  type: string
  title: string
  message: string
  relatedAssetId?: string | null
}): Promise<NotificationRow> {
  const rows = await db
    .insert(notifications)
    .values({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      related_asset_id: input.relatedAssetId ?? null,
    })
    .returning()

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
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId))
}

export async function markNotificationAsReadForUser(
  notificationId: string,
  userId: string,
): Promise<NotificationRow | null> {
  const rows = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        or(eq(notifications.user_id, userId), isNull(notifications.user_id)),
      ),
    )
    .returning()
  return rows[0] ?? null
}

export async function deleteNotificationForUser(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        or(eq(notifications.user_id, userId), isNull(notifications.user_id)),
      ),
    )
    .returning({ id: notifications.id })
  return deleted.length > 0
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(or(eq(notifications.user_id, userId), isNull(notifications.user_id)))
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  await db.delete(notifications).where(eq(notifications.id, notificationId))
}
