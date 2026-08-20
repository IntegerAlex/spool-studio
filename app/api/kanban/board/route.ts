import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getKanbanBoardData } from "@/services/kanban-service"

export async function GET() {
  try {
    const data = await getKanbanBoardData()
    const res = NextResponse.json({ data })
    res.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30")
    return res
  } catch (error) {
    logProductionRuntimeError("api-kanban-board", error)
    return NextResponse.json({ data: { assets: [], clients: [] } })
  }
}
