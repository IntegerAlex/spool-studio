import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/services/audit-log-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const action = searchParams.get('action') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;

    const result = await getAuditLogs({ limit, offset, action, entityType, userId, search, startDate, endDate });
    return NextResponse.json({ data: { entries: result.data, total: result.total } });
  } catch (error) {
    logProductionRuntimeError('api-logs-get', error);
    return NextResponse.json({ data: { entries: [], total: 0 } });
  }
}
