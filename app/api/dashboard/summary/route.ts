import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/services/dashboard-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json({ data: summary });
  } catch (error) {
    logProductionRuntimeError('api-dashboard-summary', error);
    return NextResponse.json({
      data: {
        pendingApprovals: 0,
        upcomingUploads: 0,
        totalClients: 0,
        uploadedThisMonth: 0,
      },
    });
  }
}
