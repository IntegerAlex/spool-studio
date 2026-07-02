import { insertAuditLog, listAuditLogs, type AuditLogInput, type AuditLogListOptions } from '@/repositories/audit-log-repository';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateCurrentUserProfile } from '@/services/users-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

function mapLog(row: Awaited<ReturnType<typeof insertAuditLog>>): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  };
}

export async function logAuditEvent(input: AuditLogInput): Promise<AuditLogEntry> {
  try {
    const user = await getCurrentUser();
    if (user) {
      try { await getOrCreateCurrentUserProfile(); } catch (_e) { /* best effort */ }
    }
    const record = await insertAuditLog({
      ...input,
      userId: input.userId ?? user?.id ?? null,
      userEmail: input.userEmail ?? user?.email ?? null,
      userName: input.userName ?? user?.name ?? null,
    });
    return mapLog(record);
  } catch (error) {
    logProductionRuntimeError('audit-log', error, { action: input.action, entityType: input.entityType });
    throw error;
  }
}

export async function getAuditLogs(options: AuditLogListOptions = {}): Promise<{ data: AuditLogEntry[]; total: number }> {
  try {
    const result = await listAuditLogs(options);
    return {
      data: result.data.map(mapLog),
      total: result.total,
    };
  } catch (error) {
    logProductionRuntimeError('audit-logs-list', error);
    return { data: [], total: 0 };
  }
}
