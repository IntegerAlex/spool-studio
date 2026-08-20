import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  createCycle,
  getCyclesByClientId,
} from "@/services/service-cycles-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      )
    }

    const cycles = await getCyclesByClientId(clientId)
    return NextResponse.json({ data: cycles })
  } catch (error) {
    logProductionRuntimeError("api-cycles-get", error)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body?.clientId || !body?.startDate || !body?.endDate) {
      return NextResponse.json(
        { error: "clientId, startDate, and endDate are required" },
        { status: 400 },
      )
    }

    const cycle = await createCycle({
      clientId: body.clientId,
      startDate: body.startDate,
      endDate: body.endDate,
      reelsTarget: body.reelsTarget ?? 0,
      postersTarget: body.postersTarget ?? 0,
    })

    return NextResponse.json({ data: cycle }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create cycle"
    logProductionRuntimeError("api-cycles-post", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
