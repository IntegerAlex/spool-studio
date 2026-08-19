import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  try {
    await requireUser()
  } catch (error) {
    logProductionRuntimeError("dashboard-layout", error, {
      pathname: "/dashboard",
    })
    redirect("/login")
  }

  return <DashboardShell title="Dashboard">{children}</DashboardShell>
}
