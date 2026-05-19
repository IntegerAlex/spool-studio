import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/services/dashboard-service';

export async function GET() {
  const summary = await getDashboardSummary();
  return NextResponse.json({ data: summary });
}
