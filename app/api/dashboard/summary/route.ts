import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getDashboardSummary } from "@/services/dashboard-service"

export async function GET() {
  try {
    const summary = await getDashboardSummary()
    console.info("[dashboard-debug][summary]", {
      stage: "api-route",
      totalClients: summary.totalClients,
    })
    const response = NextResponse.json({ data: summary })
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    )
    return response
  } catch (error) {
    logProductionRuntimeError("api-dashboard-summary", error)
    const response = NextResponse.json({
      data: {
        totalAssets: 0,
        pendingApprovals: 0,
        approvedAssets: 0,
        upcomingUploads: 0,
        totalClients: 0,
        uploadedThisMonth: 0,
        assetStatusBreakdown: [
          { label: "Draft", count: 0 },
          { label: "Revision", count: 0 },
          { label: "Approved", count: 0 },
          { label: "Published", count: 0 },
        ],
        recentActivity: [],
      },
    })
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}
