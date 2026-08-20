import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"
import {
  getFirstWorkspace,
  insertWorkspace,
  updateWorkspace,
} from "@/repositories/workspaces-repository"
import { listTeamMembersByWorkspaceId } from "@/repositories/team-members-repository"

type WorkspaceUpdateFields = {
  name?: string
  logo?: string | null
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const ws = await getFirstWorkspace()

    if (!ws) {
      return NextResponse.json({
        data: {
          id: null,
          name: "My Workspace",
          logo: null,
          members: [],
          createdAt: new Date(),
        },
      })
    }

    const members = await listTeamMembersByWorkspaceId(ws.id)

    return NextResponse.json({
      data: {
        id: ws.id,
        name: ws.name,
        logo: ws.logo,
        members: members.map((m) => ({
          id: m.id,
          userId: m.user_id,
          workspaceId: m.workspace_id,
          role: m.role,
          joinedAt: m.joined_at,
        })),
        createdAt: ws.created_at,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-workspace-get", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { name, logo } = await request.json()

    const existing = await getFirstWorkspace()
    let wsId: string

    if (!existing) {
      const inserted = await insertWorkspace({
        name: name || "My Workspace",
        logo: logo || null,
      })
      wsId = inserted.id
    } else {
      wsId = existing.id
      const updates: WorkspaceUpdateFields = {}
      if (name !== undefined) {
        updates.name = name
      }
      if (logo !== undefined) {
        updates.logo = logo
      }
      if (Object.keys(updates).length > 0) {
        await updateWorkspace(wsId, updates)
      }
    }

    try {
      await logAuditEvent({
        action: "workspace_updated",
        entityType: "workspace",
        entityId: wsId,
        entityName: name || "My Workspace",
        metadata: { name, logo: logo || null },
      })
    } catch {
      // Audit logging should not block workspace updates.
    }

    return NextResponse.json({
      data: {
        id: wsId,
        name: name || "My Workspace",
        logo: logo || null,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-workspace-update", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
