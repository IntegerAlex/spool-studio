import { getCurrentUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  type AuditLogInput,
  type AuditLogListOptions,
  insertAuditLog,
  listAuditLogs,
} from "@/repositories/audit-log-repository"
import type { Json } from "@/types"

export interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  metadata: Record<string, Json>
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

function mapLog(
  row: Awaited<ReturnType<typeof insertAuditLog>>,
): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    metadata: (row.metadata as Record<string, Json>) ?? {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  }
}

export async function logAuditEvent(
  input: AuditLogInput,
): Promise<AuditLogEntry | null> {
  try {
    const user = await getCurrentUser()
    const record = await insertAuditLog({
      ...input,
      userId: input.userId ?? user?.id ?? null,
      userEmail: input.userEmail ?? user?.email ?? null,
      userName: input.userName ?? user?.name ?? null,
    })
    return mapLog(record)
  } catch (error) {
    logProductionRuntimeError("audit-log", error, {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return null
  }
}

export async function getAuditLogs(
  options: AuditLogListOptions = {},
): Promise<{ data: AuditLogEntry[]; total: number }> {
  try {
    const result = await listAuditLogs(options)
    return {
      data: result.data.map(mapLog),
      total: result.total,
    }
  } catch (error) {
    logProductionRuntimeError("audit-logs-list", error)
    return { data: [], total: 0 }
  }
}
