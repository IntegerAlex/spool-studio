import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { teamMembers, workspaces } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAuditEvent } from "@/services/audit-log-service"

export async function GET() {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        logo: workspaces.logo,
        created_at: workspaces.created_at,
      })
      .from(workspaces)
      .limit(1)

    if (rows.length === 0) {
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

    const ws = rows[0]
    const members = await db
      .select({
        id: teamMembers.id,
        user_id: teamMembers.user_id,
        workspace_id: teamMembers.workspace_id,
        role: teamMembers.role,
        joined_at: teamMembers.joined_at,
      })
      .from(teamMembers)
      .where(eq(teamMembers.workspace_id, ws.id))

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

    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .limit(1)
    let wsId: string

    if (existing.length === 0) {
      const inserted = await db
        .insert(workspaces)
        .values({ name: name || "My Workspace", logo: logo || null })
        .returning({ id: workspaces.id })
      wsId = inserted[0].id
    } else {
      wsId = existing[0].id
      // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // dynamic workspace field set; values are scalars
      const sets: Record<string, unknown> = {}
      if (name !== undefined) {
        sets.name = name
      }
      if (logo !== undefined) {
        sets.logo = logo
      }
      if (Object.keys(sets).length > 0) {
        await db.update(workspaces).set(sets).where(eq(workspaces.id, wsId))
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
