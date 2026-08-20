export type {
  CalendarEvent,
  CalendarEventKind,
  CalendarRange,
  RecurrenceFreq,
  RecurrenceRule,
} from "./calendar"

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = "admin" | "designer" | "approver" | "uploader"
export type AssetType = "reel" | "poster"
export type AssetStatus =
  | "draft"
  | "uploading"
  | "uploaded"
  | "processing"
  | "approved"
  | "published"
  | "failed"
  | "archived"
  | "in_design"
  | "ready_for_review"
  | "revision_requested"
  | "scheduled"
export type CommentType =
  | "comment"
  | "revision"
  | "approval_note"
  | "internal_note"
export type RevisionStatus = "open" | "resolved"
export type ClientReferenceType =
  | "instagram"
  | "website"
  | "youtube"
  | "pinterest"
  | "drive_folder"
  | "competitor"
  | "branding"
  | "reel_reference"
  | "ad_reference"
  | "other"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  createdAt: Date
}

export interface Client {
  id: string
  name: string
  slug: string
  instagramHandle?: string
  monthlyDeliverables: number
  completedDeliverables: number
  weeklyGoal: number
  weeklyCompleted: number
  weeklyRemaining: number
  assignedTeamMembers: string[]
  brandColor?: string
  createdAt: Date
  updatedAt: Date
  monthlyReelsTarget: number
  monthlyPostsTarget: number
  completedReels: number
  completedPosters: number
  pendingApprovals: number
  pendingRevisions: number
  weeklyPosterGoal: number
  weeklyReelGoal: number
  weeklyCompletedReels: number
  weeklyCompletedPosters: number
  contractStartDate?: Date
  contractEndDate?: Date
}

export interface Asset {
  id: string
  clientId: string
  title: string
  description?: string
  type: AssetType
  status: AssetStatus
  mimeType?: string
  fileSize?: number
  fileExtension?: string
  uploadedAt: Date | null
  uploadedBy?: string
  driveFileId?: string
  fileUrl?: string
  driveFileUrl?: string
  thumbnailUrl?: string
  mediaWidth?: number
  mediaHeight?: number
  durationSeconds?: number
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  scheduledAt: Date | null
  publishDate?: string | null
  publishTime?: string | null
  scheduledBy?: string | null
  publishedAt: Date | null
  approvedAt: Date | null
  approvedBy?: string | null
  assignedTo: string[]
  revisions: AssetRevision[]
  currentRevisionId?: string
  latestRevision?: AssetRevision
  revisionCount?: number
  comments: AssetComment[]
}

export interface AssetComment {
  id: string
  assetId: string
  userId: string
  type: CommentType
  message: string
  isInternal: boolean
  revisionStatus: RevisionStatus | null
  createdAt: Date
  updatedAt: Date
}

export interface AssetActivityLog {
  id: string
  assetId: string
  userId: string | null
  action: string
  metadata: Record<string, Json>
  createdAt: Date
}

export interface AssetRevision {
  id: string
  assetId: string
  versionNumber: number
  uploadedBy?: string
  uploadedAt: Date
  driveFileId: string
  driveFileUrl?: string
  fileSize?: number
  mimeType?: string
  mediaWidth?: number
  mediaHeight?: number
  durationSeconds?: number
  changeNote?: string
  metadata?: Record<string, Json>
  createdAt: Date
}

export interface ClientReference {
  id: string
  clientId: string
  title: string
  url: string
  description: string | null
  type: ClientReferenceType
  createdAt: Date
  updatedAt: Date
}

export interface KanbanClientOption {
  id: string
  name: string
  slug?: string
}

export type UploadQueueStatus = "pending" | "scheduled" | "uploaded" | "failed"

export interface UploadQueue {
  id: string
  assetId: string
  scheduledDate: string | null
  platform: string
  status: UploadQueueStatus
  caption: string | null
  hashtags: string | null
  createdAt: string
  recurrence?: Json | null
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  relatedAssetId: string | null
  read: boolean
  createdAt: string
}

export interface SearchResults {
  clients: {
    id: string
    name: string
    slug: string
    instagramHandle: string | null
  }[]
  assets: {
    id: string
    title: string
    type: string
  }[]
}

export interface Workspace {
  id: string
  name: string
}
