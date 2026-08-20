import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm"
import { db } from "@/db"
import { auditLogs } from "@/db/schema"

export type DbAuditLog = typeof auditLogs.$inferSelect

export interface AuditLogInput {
  userId?: string | null
  userEmail?: string | null
  userName?: string | null
  action: string
  entityType: string
  entityId?: string | null
  entityName?: string | null
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // dynamic JSONB metadata column
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export interface AuditLogListOptions {
  limit?: number
  offset?: number
  action?: string
  entityType?: string
  userId?: string
  search?: string
  startDate?: string
  endDate?: string
}

export async function insertAuditLog(
  input: AuditLogInput,
): Promise<DbAuditLog> {
  // SAFETY: JSONB metadata column accepts arbitrary records; runtime validates shape.
  const metadata = (input.metadata ?? {}) as never
  const rows = await db
    .insert(auditLogs)
    .values({
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      user_name: input.userName ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      metadata,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    })
    .returning()

  const row = rows[0]
  if (!row) throw new Error("Failed to insert audit log")
  return row
}

function buildWhere(options: AuditLogListOptions) {
  const conditions = []

  if (options.action) {
    conditions.push(eq(auditLogs.action, options.action))
  }
  if (options.entityType) {
    conditions.push(eq(auditLogs.entity_type, options.entityType))
  }
  if (options.userId) {
    conditions.push(eq(auditLogs.user_id, options.userId))
  }
  if (options.search) {
    conditions.push(
      or(
        ilike(auditLogs.entity_name, `%${options.search}%`),
        ilike(auditLogs.user_email, `%${options.search}%`),
        ilike(auditLogs.user_name, `%${options.search}%`),
        ilike(auditLogs.action, `%${options.search}%`),
      ),
    )
  }
  if (options.startDate) {
    conditions.push(
      gte(auditLogs.created_at, sql`${options.startDate}::timestamptz`),
    )
  }
  if (options.endDate) {
    conditions.push(
      lte(auditLogs.created_at, sql`${options.endDate}::timestamptz`),
    )
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function listAuditLogs(
  options: AuditLogListOptions = {},
): Promise<{ data: DbAuditLog[]; total: number }> {
  const where = buildWhere(options)

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(where)
  const total = countRows[0]?.count ?? 0

  const limit = Math.min(options.limit ?? 50, 200)
  const offset = options.offset ?? 0

  const rows = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.created_at))
    .limit(limit)
    .offset(offset)

  return { data: rows, total }
}

export async function getAuditLogById(id: string): Promise<DbAuditLog | null> {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(1)
  return rows[0] ?? null
}
