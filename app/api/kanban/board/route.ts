import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getKanbanBoardData } from "@/services/kanban-service"

export async function GET() {
  try {
    const data = await getKanbanBoardData()
    return NextResponse.json({ data })
  } catch (error) {
    logProductionRuntimeError("api-kanban-board", error)
    return NextResponse.json({ data: { assets: [], clients: [] } })
  }
}
