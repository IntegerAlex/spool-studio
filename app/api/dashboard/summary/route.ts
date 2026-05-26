import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/services/dashboard-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    const response = NextResponse.json({ data: summary });
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    logProductionRuntimeError('api-dashboard-summary', error);
    const response = NextResponse.json({
      data: {
        pendingApprovals: 0,
        upcomingUploads: 0,
        totalClients: 0,
        uploadedThisMonth: 0,
      },
    });
    response.headers.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
    return response;
  }
}
