import { NextResponse } from 'next/server';
import { generateMonthlyReport } from '@/services/reports-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const now = new Date();
    const month = monthStr ? parseInt(monthStr, 10) : now.getUTCMonth() + 1;
    const year = yearStr ? parseInt(yearStr, 10) : now.getUTCFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 });
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const report = await generateMonthlyReport(clientId, month, year);
    if (!report) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    logProductionRuntimeError('api-clients-id-report-get', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
