import { NextResponse } from 'next/server';
import { getKanbanBoardData } from '@/services/kanban-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

export async function GET() {
  try {
    const data = await getKanbanBoardData();
    return NextResponse.json({ data });
  } catch (error) {
    logProductionRuntimeError('api-kanban-board', error);
    return NextResponse.json({ data: { assets: [], clients: [] } });
  }
}
