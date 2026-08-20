import { pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "designer",
  "approver",
  "uploader",
])

export const assetTypeEnum = pgEnum("asset_type", ["reel", "poster"])

export const assetStatusEnum = pgEnum("asset_status", [
  "draft",
  "uploading",
  "uploaded",
  "processing",
  "approved",
  "published",
  "failed",
  "archived",
  "in_design",
  "ready_for_review",
  "revision_requested",
  "scheduled",
])

export const commentTypeEnum = pgEnum("comment_type", [
  "comment",
  "revision",
  "approval_note",
  "internal_note",
])

export const revisionStatusEnum = pgEnum("revision_status", [
  "open",
  "resolved",
])

export const clientReferenceTypeEnum = pgEnum("client_reference_type", [
  "instagram",
  "website",
  "youtube",
  "pinterest",
  "drive_folder",
  "competitor",
  "branding",
  "reel_reference",
  "ad_reference",
  "other",
])
