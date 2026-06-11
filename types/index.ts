export type UserRole = 'admin' | 'designer' | 'approver' | 'uploader';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  slug?: string;
  instagramHandle: string;
  monthlyDeliverables: number;
  completedDeliverables: number;
  monthlyGoal?: number;
  weeklyGoal?: number;
  weeklyCompleted?: number;
  weeklyRemaining?: number;
  assignedTeamMembers: string[];
  brandColor?: string;
  logo?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  monthlyReelsTarget?: number;
  monthlyPostsTarget?: number;
  completedReels?: number;
  completedPosters?: number;
  pendingApprovals?: number;
  pendingRevisions?: number;
  weeklyPosterGoal?: number;
  weeklyReelGoal?: number;
  weeklyCompletedReels?: number;
  weeklyCompletedPosters?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
}

export interface KanbanClientOption {
  id: string;
  name: string;
}

export type ClientReferenceType =
  | 'instagram'
  | 'website'
  | 'youtube'
  | 'pinterest'
  | 'drive_folder'
  | 'competitor'
  | 'branding'
  | 'reel_reference'
  | 'ad_reference'
  | 'other';

export interface ClientReference {
  id: string;
  clientId: string;
  title: string;
  url: string;
  description?: string | null;
  type: ClientReferenceType;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetStatus =
  | 'draft'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'approved'
  | 'published'
  | 'failed'
  | 'archived'
  | 'in_design'
  | 'ready_for_review'
  | 'revision_requested'
  | 'scheduled';
export type AssetType = 'reel' | 'poster';
export type CommentType = 'comment' | 'revision' | 'approval_note' | 'internal_note';
export type RevisionStatus = 'open' | 'resolved';

export interface Asset {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;
  mimeType?: string | null;
  fileSize?: number | null;
  fileExtension?: string | null;
  uploadedAt?: Date | null;
  uploadedBy?: string | null;
  driveFileId?: string | null;
  fileUrl?: string;
  driveFileUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  thumbnailUrl?: string;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  durationSeconds?: number | null;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date | null;
  publishDate?: string | null;
  publishTime?: string | null;
  scheduledBy?: string | null;
  publishedAt?: Date | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  googleCalendarEventId?: string | null;
  googleCalendarEventUrl?: string | null;
  calendarSyncedAt?: Date | null;
  assignedTo: string[];
  revisions: AssetRevision[];
  // Revision/versioning fields
  currentRevisionId?: string | null;
  latestRevision?: AssetRevision | null;
  revisionCount?: number;
  comments: AssetComment[];
}

export interface AssetRevision {
  id: string;
  assetId: string;
  versionNumber: number;
  uploadedBy?: string | null;
  uploadedAt: Date;
  driveFileId: string;
  driveFileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  durationSeconds?: number | null;
  changeNote?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AssetComment {
  id: string;
  assetId: string;
  userId: string;
  type: CommentType;
  message: string;
  revisionStatus?: RevisionStatus | null;
  createdAt: Date;
  updatedAt: Date;
  authorId?: string;
  content?: string;
  replies?: AssetComment[];
  isInternal?: boolean;
  version?: number;
  createdBy?: string;
  reason?: string;
  fileUrl?: string;
}

export interface AssetActivityLog {
  id: string;
  assetId: string;
  userId?: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'approval' | 'revision' | 'upload' | 'comment' | 'assigned';
  title: string;
  message: string;
  relatedAssetId?: string;
  read: boolean;
  createdAt: Date;
}

export interface UploadQueue {
  id: string;
  assetId: string;
  scheduledDate: Date;
  platform: 'instagram' | 'tiktok' | 'youtube';
  status: 'pending' | 'scheduled' | 'uploaded' | 'failed';
  caption?: string;
  hashtags?: string[];
}

export interface TeamMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: UserRole;
  joinedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  logo?: string;
  members: TeamMember[];
  createdAt: Date;
}
