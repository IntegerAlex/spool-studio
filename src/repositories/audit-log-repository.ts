import { query, queryOne } from '@/lib/db';

export interface DbAuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogListOptions {
  limit?: number;
  offset?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function insertAuditLog(input: AuditLogInput): Promise<DbAuditLog> {
  const row = await queryOne<DbAuditLog>(
    `INSERT INTO audit_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_name, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.userId ?? null,
      input.userEmail ?? null,
      input.userName ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.entityName ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ]
  );
  if (!row) throw new Error('Failed to insert audit log');
  return row;
}

export async function listAuditLogs(options: AuditLogListOptions = {}): Promise<{ data: DbAuditLog[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(options.action);
  }
  if (options.entityType) {
    conditions.push(`entity_type = $${paramIndex++}`);
    params.push(options.entityType);
  }
  if (options.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(options.userId);
  }
  if (options.search) {
    conditions.push(`(entity_name ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex} OR user_name ILIKE $${paramIndex} OR action ILIKE $${paramIndex})`);
    params.push(`%${options.search}%`);
    paramIndex++;
  }
  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countRow?.count ?? '0', 10);

  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;

  const { rows: data } = await query<DbAuditLog>(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return { data, total };
}

export async function getAuditLogById(id: string): Promise<DbAuditLog | null> {
  return queryOne<DbAuditLog>('SELECT * FROM audit_logs WHERE id = $1', [id]);
}
