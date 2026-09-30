import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mock refs (hoisted) ─────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOrCreateCurrentUserProfile: vi.fn(),
  deleteFile: vi.fn(),
  uploadFile: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  extractAssetMetadata: vi.fn(),
  emitEvent: vi.fn(),
  sendAssetUploadNotification: vi.fn(),
  sendDesignerNotification: vi.fn(),
  sendRevisionUploadNotification: vi.fn(),
  getAssetById: vi.fn(),
  insertAsset: vi.fn(),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
  listAssets: vi.fn(),
  listAssetsByClientId: vi.fn(),
  listAssetsByStatuses: vi.fn(),
  publishAssetWithRecord: vi.fn(),
  listAssetRevisionsByAssetId: vi.fn(),
  getAssetRevisionById: vi.fn(),
  insertAssetRevision: vi.fn(),
  getClientById: vi.fn(),
  getUserById: vi.fn(),
  listCommentsByAssetId: vi.fn(),
  logAssetActivity: vi.fn(),
  logAuditEvent: vi.fn(),
  markDayPlanDone: vi.fn(),
  getDayPlanById: vi.fn(),
  getActiveCycleForClientService: vi.fn(),
  getNextAssetNumber: vi.fn(),
  generateAssetTitle: vi.fn(),
  extractClientShortForm: vi.fn(),
}))

// ── Wire mocks to module paths ──────────────────────────────────────
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/services/users-service", () => ({
  getOrCreateCurrentUserProfile: mocks.getOrCreateCurrentUserProfile,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/integrations/r2/r2-service", () => ({
  deleteFile: mocks.deleteFile,
  uploadFile: mocks.uploadFile,
  getPresignedDownloadUrl: mocks.getPresignedDownloadUrl,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/asset-metadata", () => ({
  extractAssetMetadata: mocks.extractAssetMetadata,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/event-bus", () => ({ emitEvent: mocks.emitEvent }))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/notifications/mailgun", () => ({
  sendAssetUploadNotification: mocks.sendAssetUploadNotification,
  sendDesignerNotification: mocks.sendDesignerNotification,
  sendRevisionUploadNotification: mocks.sendRevisionUploadNotification,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/repositories/assets-repository", () => ({
  deleteAsset: mocks.deleteAsset,
  getAssetById: mocks.getAssetById,
  insertAsset: mocks.insertAsset,
  listAssets: mocks.listAssets,
  listAssetsByClientId: mocks.listAssetsByClientId,
  listAssetsByStatuses: mocks.listAssetsByStatuses,
  publishAssetWithRecord: mocks.publishAssetWithRecord,
  updateAsset: mocks.updateAsset,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/repositories/asset-revisions-repository", () => ({
  listAssetRevisionsByAssetId: mocks.listAssetRevisionsByAssetId,
  getAssetRevisionById: mocks.getAssetRevisionById,
  insertAssetRevision: mocks.insertAssetRevision,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/repositories/clients-repository", () => ({
  getClientById: mocks.getClientById,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/repositories/users-repository", () => ({
  getUserById: mocks.getUserById,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/repositories/asset-comments-repository", () => ({
  listCommentsByAssetId: mocks.listCommentsByAssetId,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/services/activity-service", () => ({
  logAssetActivity: mocks.logAssetActivity,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/services/audit-log-service", () => ({
  logAuditEvent: mocks.logAuditEvent,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/services/service-cycles-service", () => ({
  getActiveCycleForClientService: mocks.getActiveCycleForClientService,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/services/day-plans-service", () => ({
  markDayPlanDone: mocks.markDayPlanDone,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/repositories/day-plans-repository", () => ({
  getDayPlanById: mocks.getDayPlanById,
}))
// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/services/numbering-service", () => ({
  getNextAssetNumber: mocks.getNextAssetNumber,
  generateAssetTitle: mocks.generateAssetTitle,
  extractClientShortForm: mocks.extractClientShortForm,
}))

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/file-url", () => ({
  sanitizeFileUrl: (url: string | null) => url,
}))

import type { AuthUser } from "@/lib/auth/types"
import { approveAsset, updateAsset } from "@/services/assets-service"

function sessionUser(role: AuthUser["role"], id = `${role}-1`): AuthUser {
  return {
    id,
    email: `${role}@test.com`,
    name: "Test User",
    role,
    avatarUrl: null,
  }
}

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // test row overrides
function dbAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    client_id: "client-1",
    title: "Test Reel",
    type: "reel",
    status: "ready_for_review",
    drive_file_id: "clients/client-1/assets/asset-1/v1.png",
    drive_file_url: null,
    thumbnail_url: null,
    mime_type: "image/png",
    file_size: 1024,
    file_extension: "png",
    uploaded_at: "2026-01-01T00:00:00.000Z",
    uploaded_by: "designer-1",
    media_width: 1080,
    media_height: 1920,
    duration_seconds: null,
    created_by: "designer-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    scheduled_at: null,
    publish_date: null,
    publish_time: null,
    scheduled_by: null,
    published_at: null,
    approved_at: null,
    approved_by: null,
    assigned_to: null,
    recurrence: null,
    current_revision_id: null,
    latest_revision_id: null,
    revision_count: 1,
    cycle_id: null,
    asset_number: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
  mocks.getPresignedDownloadUrl.mockResolvedValue(null)
  mocks.logAssetActivity.mockResolvedValue(undefined)
  mocks.logAuditEvent.mockResolvedValue(undefined)
})

describe("updateAsset RBAC (PATCH-equivalent)", () => {
  it("rejects a designer status change to approved (needs assets:approve)", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("designer"))
    mocks.getAssetById.mockResolvedValue(dbAsset())

    await expect(
      updateAsset("asset-1", { status: "approved" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 403 })
    await expect(
      updateAsset("asset-1", { status: "approved" }),
    ).rejects.toThrow(/assets:approve/)
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("allows an approver status-only change to approved", async () => {
    const approver = sessionUser("approver")
    mocks.getCurrentUser.mockResolvedValue(approver)
    mocks.getAssetById.mockResolvedValue(dbAsset())
    mocks.updateAsset.mockResolvedValue(dbAsset({ status: "approved" }))

    const result = await updateAsset("asset-1", { status: "approved" })

    expect(result.status).toBe("approved")
    expect(mocks.updateAsset).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({ status: "approved", approved_by: approver.id }),
    )
  })

  it("rejects an approver field edit (needs assets:update)", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("approver"))
    mocks.getAssetById.mockResolvedValue(dbAsset())

    await expect(
      updateAsset("asset-1", { title: "Sneaky rename" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 403 })
    await expect(
      updateAsset("asset-1", { title: "Sneaky rename" }),
    ).rejects.toThrow(/assets:update/)
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("rejects an approver status+field combo edit", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("approver"))
    mocks.getAssetById.mockResolvedValue(dbAsset())

    await expect(
      updateAsset("asset-1", { status: "approved", title: "Sneaky rename" }),
    ).rejects.toMatchObject({ status: 403 })
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("lets a designer move a card between non-approval states", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("designer"))
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "draft" }))
    mocks.updateAsset.mockResolvedValue(dbAsset({ status: "ready_for_review" }))

    const result = await updateAsset("asset-1", {
      status: "ready_for_review",
    })

    expect(result.status).toBe("ready_for_review")
  })

  it("rejects anonymous callers with 401", async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    mocks.getAssetById.mockResolvedValue(dbAsset())

    await expect(
      updateAsset("asset-1", { title: "Nope" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 401 })
  })
})

describe("updateAsset invalid transition error", () => {
  it("carries from/to/allowed and maps to HTTP 422", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("admin"))
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "published" }))

    const attempt = updateAsset("asset-1", { status: "draft" })

    await expect(attempt).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
    })
    await expect(updateAsset("asset-1", { status: "draft" })).rejects.toThrow(
      /Invalid status transition from "published" to "draft".*Allowed transitions from "published": "archived"/,
    )
  })
})

describe("approveAsset service-level RBAC", () => {
  it("rejects a designer caller with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("designer"))
    mocks.getAssetById.mockResolvedValue(dbAsset())

    await expect(approveAsset("asset-1", "designer-1")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
    })
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("allows an approver caller", async () => {
    mocks.getCurrentUser.mockResolvedValue(sessionUser("approver"))
    mocks.getAssetById.mockResolvedValue(dbAsset())
    mocks.updateAsset.mockResolvedValue(dbAsset({ status: "approved" }))

    const result = await approveAsset("asset-1", "approver-1")

    expect(result.status).toBe("approved")
  })
})
