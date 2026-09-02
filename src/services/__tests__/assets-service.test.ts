import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mock refs (hoisted) ─────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  // auth + profile
  getCurrentUser: vi.fn(),
  getOrCreateCurrentUserProfile: vi.fn(),
  // r2
  deleteFile: vi.fn(),
  uploadFile: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  // metadata
  extractAssetMetadata: vi.fn(),
  // event bus
  emitEvent: vi.fn(),
  // mailgun notifications
  sendAssetUploadNotification: vi.fn(),
  sendDesignerNotification: vi.fn(),
  sendRevisionUploadNotification: vi.fn(),
  // repositories
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
  // services
  logAssetActivity: vi.fn(),
  logAuditEvent: vi.fn(),
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
vi.mock("@/services/numbering-service", () => ({
  getNextAssetNumber: mocks.getNextAssetNumber,
  generateAssetTitle: mocks.generateAssetTitle,
  extractClientShortForm: mocks.extractClientShortForm,
}))

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/file-url", () => ({
  sanitizeFileUrl: (url: string | null) => url,
}))

import {
  approveAsset,
  createAsset,
  finalizeAssetUpload,
  getAssetDetail,
  getAssetR2Key,
  getAssets,
  getAssetsByClientId,
  rejectAsset,
  removeAsset,
  setAssetCurrentRevision,
  updateAsset,
  uploadAssetFile,
  type AssetUploadFinalizationInput,
} from "@/services/assets-service"

const AUTH_USER = {
  id: "user-1",
  email: "admin@test.com",
  full_name: "Admin",
  role: "admin",
}

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // test row overrides
function dbAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    client_id: "client-1",
    title: "Test Reel",
    type: "reel",
    status: "draft",
    drive_file_id: null,
    drive_file_url: null,
    thumbnail_url: null,
    mime_type: null,
    file_size: null,
    file_extension: null,
    uploaded_at: null,
    uploaded_by: null,
    media_width: null,
    media_height: null,
    duration_seconds: null,
    created_by: "user-1",
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
    revision_count: 0,
    cycle_id: null,
    asset_number: null,
    ...overrides,
  }
}

describe("getAssetR2Key", () => {
  it("builds the R2 object key from client/asset/file", () => {
    expect(getAssetR2Key("c1", "a1", "poster.png")).toBe(
      "clients/c1/assets/a1/poster.png",
    )
  })
})

describe("getAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
  })

  it("returns an empty list when no assets exist", async () => {
    mocks.listAssets.mockResolvedValue([])
    await expect(getAssets()).resolves.toEqual([])
    expect(mocks.listAssets).toHaveBeenCalledWith(200)
  })

  it("maps repository rows to domain assets", async () => {
    mocks.listAssets.mockResolvedValue([dbAsset()])
    const result = await getAssets()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("asset-1")
    expect(result[0].clientId).toBe("client-1")
    expect(result[0].title).toBe("Test Reel")
    expect(result[0].createdAt).toBeInstanceOf(Date)
  })
})

describe("getAssetsByClientId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
  })

  it("delegates to listAssetsByClientId and maps rows", async () => {
    mocks.listAssetsByClientId.mockResolvedValue([dbAsset()])
    const result = await getAssetsByClientId("client-1")
    expect(mocks.listAssetsByClientId).toHaveBeenCalledWith("client-1", 200)
    expect(result).toHaveLength(1)
  })
})

describe("getAssetDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
  })

  it("returns null when the asset does not exist", async () => {
    mocks.getAssetById.mockResolvedValue(null)
    await expect(getAssetDetail("missing")).resolves.toBeNull()
  })

  it("populates revisions and latest revision", async () => {
    const asset = dbAsset({
      current_revision_id: "rev-1",
      latest_revision_id: "rev-1",
      revision_count: 1,
    })
    mocks.getAssetById.mockResolvedValue(asset)
    mocks.listAssetRevisionsByAssetId.mockResolvedValue([
      {
        id: "rev-1",
        asset_id: "asset-1",
        version_number: 1,
        uploaded_by: "user-1",
        uploaded_at: "2026-01-02T00:00:00.000Z",
        drive_file_id: "clients/client-1/assets/asset-1/v1.png",
        drive_file_url: null,
        file_size: 1024,
        mime_type: "image/png",
        media_width: 1080,
        media_height: 1920,
        duration_seconds: null,
        change_note: null,
        metadata: null,
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ])
    mocks.getPresignedDownloadUrl.mockResolvedValue("https://r2.example/signed")

    const result = await getAssetDetail("asset-1")

    expect(result).not.toBeNull()
    expect(result!.revisions).toHaveLength(1)
    expect(result!.currentRevisionId).toBe("rev-1")
    expect(result!.revisionCount).toBe(1)
    // revisions array is presigned
    expect(result!.revisions[0].driveFileUrl).toBe("https://r2.example/signed")
    // latestRevision mapping surfaces the latest row
    expect(result!.latestRevision?.id).toBe("rev-1")
  })
})

describe("setAssetCurrentRevision", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when the revision does not belong to the asset", async () => {
    mocks.getAssetRevisionById.mockResolvedValue({
      id: "rev-x",
      asset_id: "other-asset",
    })
    await expect(
      setAssetCurrentRevision("asset-1", "rev-x"),
    ).rejects.toThrow("Revision not found for asset")
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("updates the current revision pointer when ownership matches", async () => {
    mocks.getAssetRevisionById.mockResolvedValue({
      id: "rev-1",
      asset_id: "asset-1",
    })
    mocks.updateAsset.mockResolvedValue(dbAsset())
    mocks.logAssetActivity.mockResolvedValue(undefined)

    await setAssetCurrentRevision("asset-1", "rev-1")
    expect(mocks.updateAsset).toHaveBeenCalledWith("asset-1", {
      current_revision_id: "rev-1",
    })
  })
})

describe("createAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
    mocks.logAssetActivity.mockResolvedValue(undefined)
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("throws Unauthorized when no user is present", async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    await expect(
      createAsset({ clientId: "client-1", title: "T", type: "reel" }),
    ).rejects.toThrow("Unauthorized")
  })

  it("throws when a scheduled status has no scheduled date", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    await expect(
      createAsset({
        clientId: "client-1",
        title: "T",
        type: "reel",
        status: "scheduled",
      }),
    ).rejects.toThrow("Scheduled assets require a scheduled date")
  })

  it("throws when the assigned user does not exist", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getUserById.mockResolvedValue(null)
    await expect(
      createAsset({
        clientId: "client-1",
        title: "T",
        type: "reel",
        assignedTo: "ghost",
      }),
    ).rejects.toThrow("Assigned user not found")
  })

  it("inserts an asset and returns the mapped result", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.insertAsset.mockResolvedValue(dbAsset({ title: "T" }))

    const result = await createAsset({
      clientId: "client-1",
      title: "T",
      type: "reel",
    })

    expect(result.title).toBe("T")
    expect(mocks.insertAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        title: "T",
        type: "reel",
        status: "draft",
        created_by: "user-1",
      }),
    )
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "asset_created" }),
    )
  })

  it("auto-generates a titled asset from the active service cycle", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getActiveCycleForClientService.mockResolvedValue({
      id: "cycle-1",
      startDate: "2026-07-01",
    })
    mocks.getNextAssetNumber.mockResolvedValue(3)
    mocks.getClientById.mockResolvedValue({ name: "FlySeas" })
    mocks.extractClientShortForm.mockReturnValue("FS")
    mocks.generateAssetTitle.mockReturnValue("FS_Jul_R03")
    mocks.insertAsset.mockResolvedValue(dbAsset({ title: "FS_Jul_R03" }))

    const result = await createAsset({
      clientId: "client-1",
      title: "",
      type: "reel",
    })

    expect(mocks.generateAssetTitle).toHaveBeenCalledWith(
      "FS",
      "2026-07-01",
      "reel",
      3,
    )
    expect(mocks.insertAsset).toHaveBeenCalledWith(
      expect.objectContaining({ cycle_id: "cycle-1", asset_number: 3 }),
    )
    expect(result.title).toBe("FS_Jul_R03")
  })

  it("throws when no active cycle exists for auto-numbered titles", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getActiveCycleForClientService.mockResolvedValue(null)
    await expect(
      createAsset({ clientId: "client-1", title: "", type: "reel" }),
    ).rejects.toThrow("No active service cycle found")
  })
})

describe("updateAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
    mocks.logAssetActivity.mockResolvedValue(undefined)
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("throws when the asset does not exist", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getAssetById.mockResolvedValue(null)
    await expect(updateAsset("missing", { title: "X" })).rejects.toThrow(
      "Asset not found",
    )
  })

  it("rejects an invalid status transition", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "published" }))
    await expect(updateAsset("asset-1", { status: "draft" })).rejects.toThrow(
      "Invalid status transition",
    )
  })

  it("throws when scheduling an asset without a scheduled date", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "approved" }))
    await expect(updateAsset("asset-1", { status: "scheduled" })).rejects.toThrow(
      "Scheduled assets require a scheduled date",
    )
  })

  it("updates a valid field and returns the mapped asset", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getAssetById.mockResolvedValue(dbAsset({ title: "Old" }))
    mocks.updateAsset.mockResolvedValue(dbAsset({ title: "New" }))

    const result = await updateAsset("asset-1", { title: "New" })

    expect(mocks.updateAsset).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({ title: "New" }),
    )
    expect(result.title).toBe("New")
  })

  it("emits a status-changed event and logs activity", async () => {
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ status: "ready_for_review", drive_file_id: "r2/key" }),
    )
    mocks.getPresignedDownloadUrl.mockResolvedValue("https://r2.example/signed")
    mocks.updateAsset.mockResolvedValue(
      dbAsset({ status: "approved", drive_file_id: "r2/key" }),
    )

    await updateAsset("asset-1", { status: "approved" })

    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "asset:status-changed",
        payload: expect.objectContaining({ nextStatus: "approved" }),
      }),
    )
  })
})

describe("approveAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("throws when the asset does not exist", async () => {
    mocks.getAssetById.mockResolvedValue(null)
    await expect(approveAsset("missing", "user-1")).rejects.toThrow(
      "Asset not found",
    )
  })

  it("returns the mapped asset unchanged when already approved", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "approved" }))
    const result = await approveAsset("asset-1", "user-1")
    expect(result.status).toBe("approved")
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("throws when the asset is not eligible for approval", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "published" }))
    await expect(approveAsset("asset-1", "user-1")).rejects.toThrow(
      "Asset is not eligible for approval",
    )
  })

  it("throws when the asset has no uploaded file", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ status: "ready_for_review", drive_file_id: null }),
    )
    await expect(approveAsset("asset-1", "user-1")).rejects.toThrow(
      "Asset has no uploaded file",
    )
  })

  it("approves an eligible uploaded asset", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ status: "ready_for_review", drive_file_id: "r2/key" }),
    )
    mocks.updateAsset.mockResolvedValue(
      dbAsset({ status: "approved", drive_file_id: "r2/key" }),
    )
    mocks.getPresignedDownloadUrl.mockResolvedValue("https://r2.example/signed")

    const result = await approveAsset("asset-1", "user-1")

    expect(mocks.updateAsset).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({
        status: "approved",
        approved_by: "user-1",
      }),
    )
    expect(result.status).toBe("approved")
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "asset:status-changed" }),
    )
  })
})

describe("rejectAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("throws when the asset does not exist", async () => {
    mocks.getAssetById.mockResolvedValue(null)
    await expect(rejectAsset("missing", "user-1")).rejects.toThrow(
      "Asset not found",
    )
  })

  it("returns unchanged when already in revision_requested", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ status: "revision_requested" }),
    )
    const result = await rejectAsset("asset-1", "user-1")
    expect(result.status).toBe("revision_requested")
    expect(mocks.updateAsset).not.toHaveBeenCalled()
  })

  it("throws when the asset is not eligible for rejection", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "published" }))
    await expect(rejectAsset("asset-1", "user-1")).rejects.toThrow(
      "Asset is not eligible for rejection",
    )
  })

  it("moves an eligible asset to revision_requested", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ status: "ready_for_review", drive_file_id: "r2/key" }),
    )
    mocks.updateAsset.mockResolvedValue(
      dbAsset({ status: "revision_requested", drive_file_id: "r2/key" }),
    )
    const result = await rejectAsset("asset-1", "user-1")
    expect(mocks.updateAsset).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({ status: "revision_requested" }),
    )
    expect(result.status).toBe("revision_requested")
  })

  it("notifies the assigned designer on rejection", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({
        status: "ready_for_review",
        drive_file_id: "r2/key",
        assigned_to: "designer-1",
      }),
    )
    mocks.getUserById.mockResolvedValue({
      id: "designer-1",
      email: "designer@test.com",
      full_name: "Designer",
    })
    mocks.getClientById.mockResolvedValue({ name: "Acme" })
    mocks.listCommentsByAssetId.mockResolvedValue([
      { message: "Please fix the typo" },
    ])
    mocks.updateAsset.mockResolvedValue(
      dbAsset({ status: "revision_requested", drive_file_id: "r2/key" }),
    )

    await rejectAsset("asset-1", "approver-1")

    expect(mocks.sendDesignerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "revision_requested",
        designerId: "designer-1",
        designerEmail: "designer@test.com",
        commentMessage: "Please fix the typo",
      }),
    )
  })

  it("does not notify when the rejecter is the assigned designer", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({
        status: "ready_for_review",
        drive_file_id: "r2/key",
        assigned_to: "user-1",
      }),
    )
    mocks.getUserById.mockResolvedValue({
      id: "user-1",
      email: "user-1@test.com",
      full_name: "User One",
    })
    mocks.updateAsset.mockResolvedValue(
      dbAsset({ status: "revision_requested", drive_file_id: "r2/key" }),
    )

    await rejectAsset("asset-1", "user-1")

    expect(mocks.sendDesignerNotification).not.toHaveBeenCalled()
  })
})

describe("removeAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("deletes the R2 file and the DB row", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ drive_file_id: "r2/key" }),
    )
    mocks.deleteFile.mockResolvedValue(undefined)
    mocks.deleteAsset.mockResolvedValue(undefined)

    await removeAsset("asset-1")

    expect(mocks.deleteFile).toHaveBeenCalledWith("r2/key")
    expect(mocks.deleteAsset).toHaveBeenCalledWith("asset-1")
  })

  it("still deletes the row when R2 cleanup fails", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({ drive_file_id: "r2/key" }),
    )
    mocks.deleteFile.mockRejectedValue(new Error("R2 down"))
    mocks.deleteAsset.mockResolvedValue(undefined)

    await expect(removeAsset("asset-1")).resolves.toBeUndefined()
    expect(mocks.deleteAsset).toHaveBeenCalledWith("asset-1")
  })

  it("deletes the row for an asset with no file", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ drive_file_id: null }))
    mocks.deleteAsset.mockResolvedValue(undefined)

    await removeAsset("asset-1")

    expect(mocks.deleteFile).not.toHaveBeenCalled()
    expect(mocks.deleteAsset).toHaveBeenCalledWith("asset-1")
  })
})

function uploadResult(
  overrides: Partial<AssetUploadFinalizationInput["uploadResult"]> = {},
): AssetUploadFinalizationInput["uploadResult"] {
  const base = {
    key: "clients/client-1/assets/asset-1/test.png",
    url: "https://r2.example/object",
    mimeType: "image/png",
    fileSize: 2048,
    uploadStatus: "uploaded" as const,
    mediaWidth: 100,
    mediaHeight: 200,
    durationSeconds: null,
    thumbnailLink: null,
  }
  // SAFETY: spread merges override fields onto base, both of the target type.
  return { ...base, ...overrides }
}

function makeFile(): File {
  const fileLike = {
    name: "test.png",
    type: "image/png",
    size: 4,
    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer),
  }
  // SAFETY: uploadAssetFile only reads name/type/size/arrayBuffer; this object satisfies that surface.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions  // File has many members this helper doesn't need
  return fileLike as unknown as File
}

describe("finalizeAssetUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
    mocks.insertAssetRevision.mockResolvedValue({ id: "rev-1" })
    mocks.updateAsset.mockResolvedValue(dbAsset())
    mocks.logAssetActivity.mockResolvedValue(undefined)
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("throws Unauthorized when no user is present", async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    await expect(
      finalizeAssetUpload("asset-1", {
        fileName: "test.png",
        uploadResult: uploadResult(),
      }),
    ).rejects.toThrow("Unauthorized")
  })

  it("throws when the asset does not exist", async () => {
    mocks.getAssetById.mockResolvedValue(null)
    await expect(
      finalizeAssetUpload("asset-1", {
        fileName: "test.png",
        uploadResult: uploadResult(),
      }),
    ).rejects.toThrow("Asset not found")
  })

  it("finalizes a fresh upload and records a revision", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "draft" }))
    mocks.listAssetRevisionsByAssetId.mockResolvedValue([])

    const result = await finalizeAssetUpload("asset-1", {
      fileName: "test.png",
      uploadResult: uploadResult(),
    })

    expect(mocks.insertAssetRevision).toHaveBeenCalled()
    expect(result.upload.uploadStatus).toBe("uploaded")
    expect(result.upload.r2Key).toBe(
      "clients/client-1/assets/asset-1/test.png",
    )
    expect(mocks.sendAssetUploadNotification).toHaveBeenCalled()
    expect(mocks.sendRevisionUploadNotification).not.toHaveBeenCalled()
  })

  it("treats an existing file as a revision upload and sends the revision notification", async () => {
    mocks.getAssetById.mockResolvedValue(
      dbAsset({
        status: "ready_for_review",
        drive_file_id: "clients/client-1/assets/asset-1/v1.png",
        revision_count: 1,
        uploaded_at: "2026-01-01T00:00:00.000Z",
      }),
    )

    const result = await finalizeAssetUpload("asset-1", {
      fileName: "v2.png",
      uploadResult: uploadResult(),
    })

    expect(result.upload.uploadStatus).toBe("uploaded")
    expect(mocks.sendRevisionUploadNotification).toHaveBeenCalledWith(
      expect.objectContaining({ revisionVersion: 2 }),
    )
    expect(mocks.sendAssetUploadNotification).not.toHaveBeenCalled()
  })
})

describe("uploadAssetFile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue(AUTH_USER)
    mocks.getOrCreateCurrentUserProfile.mockResolvedValue({})
    mocks.getPresignedDownloadUrl.mockResolvedValue(null)
    mocks.insertAssetRevision.mockResolvedValue({ id: "rev-1" })
    mocks.updateAsset.mockResolvedValue(dbAsset())
    mocks.logAssetActivity.mockResolvedValue(undefined)
    mocks.logAuditEvent.mockResolvedValue(undefined)
    mocks.uploadFile.mockResolvedValue({
      key: "clients/client-1/assets/asset-1/test.png",
      url: "https://r2.example/object",
    })
    mocks.extractAssetMetadata.mockResolvedValue({
      updates: { mime_type: "image/png" },
      extractedFields: { mediaWidth: 100, mediaHeight: 200, durationSeconds: null },
    })
  })

  it("throws Unauthorized when no user is present", async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    const file = makeFile()
    await expect(uploadAssetFile("asset-1", file)).rejects.toThrow(
      "Unauthorized",
    )
  })

  it("throws when the asset does not exist", async () => {
    mocks.getAssetById.mockResolvedValue(null)
    const file = makeFile()
    await expect(uploadAssetFile("asset-1", file)).rejects.toThrow(
      "Asset not found",
    )
  })

  it("uploads a file, records a revision, and notifies", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "draft" }))
    const file = makeFile()

    const result = await uploadAssetFile("asset-1", file)

    expect(mocks.uploadFile).toHaveBeenCalled()
    expect(mocks.extractAssetMetadata).toHaveBeenCalled()
    expect(mocks.insertAssetRevision).toHaveBeenCalled()
    expect(result.upload.uploadStatus).toBe("uploaded")
    expect(mocks.sendAssetUploadNotification).toHaveBeenCalled()
  })

  it("propagates R2 upload failures", async () => {
    mocks.getAssetById.mockResolvedValue(dbAsset({ status: "draft" }))
    mocks.uploadFile.mockRejectedValue(new Error("R2 unreachable"))
    const file = makeFile()

    await expect(uploadAssetFile("asset-1", file)).rejects.toThrow(
      "R2 unreachable",
    )
    expect(mocks.uploadFile).toHaveBeenCalled()
  })
})
