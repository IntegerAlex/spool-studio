import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getStorageUsage } from "@/services/storage-service"

export async function GET() {
  try {
    const usage = await getStorageUsage()
    return NextResponse.json({ data: usage })
  } catch (error) {
    logProductionRuntimeError("api-storage-usage-get", error)
    return jsonError(error)
  }
}
