import type { Database } from './database';

export type UserRole = Database['public']['Enums']['user_role'];
export type AssetType = Database['public']['Enums']['asset_type'];
export type AssetStatus = Database['public']['Enums']['asset_status'];
export type CommentType = Database['public']['Enums']['comment_type'];
export type RevisionStatus = Database['public']['Enums']['revision_status'];
export type ClientReferenceType = Database['public']['Enums']['client_reference_type'];

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
  slug: string;
  instagramHandle?: string;
  monthlyDeliverables: number;
  completedDeliverables: number;
  weeklyGoal: number;
  weeklyCompleted: number;
  weeklyRemaining: number;
  assignedTeamMembers: string[];
  brandColor?: string;
  createdAt: Date;
  updatedAt: Date;
  monthlyReelsTarget: number;
  monthlyPostsTarget: number;
  completedReels: number;
  completedPosters: number;
  pendingApprovals: number;
  pendingRevisions: number;
  weeklyPosterGoal: number;
  weeklyReelGoal: number;
  weeklyCompletedReels: number;
  weeklyCompletedPosters: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
}

export interface Asset {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;
  mimeType?: string;
  fileSize?: number;
  fileExtension?: string;
  uploadedAt: Date | null;
  uploadedBy?: string;
  driveFileId?: string;
  fileUrl?: string;
  driveFileUrl?: string;
  thumbnailUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  durationSeconds?: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt: Date | null;
  publishDate?: string | null;
  publishTime?: string | null;
  scheduledBy?: string | null;
  publishedAt: Date | null;
  approvedAt: Date | null;
  approvedBy?: string | null;
  assignedTo: string[];
  revisions: AssetRevision[];
  currentRevisionId?: string;
  latestRevision?: AssetRevision;
  revisionCount?: number;
  comments: AssetComment[];
}

export interface AssetComment {
  id: string;
  assetId: string;
  userId: string;
  type: CommentType;
  message: string;
  isInternal: boolean;
  revisionStatus: RevisionStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetActivityLog {
  id: string;
  assetId: string;
  userId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AssetRevision {
  id: string;
  assetId: string;
  versionNumber: number;
  uploadedBy?: string;
  uploadedAt: Date;
  driveFileId: string;
  driveFileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  durationSeconds?: number;
  changeNote?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ClientReference {
  id: string;
  clientId: string;
  title: string;
  url: string;
  description: string | null;
  type: ClientReferenceType;
  createdAt: Date;
  updatedAt: Date;
}

export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type AssetInsert = Database['public']['Tables']['content_assets']['Insert'];

export interface KanbanClientOption {
  id: string;
  name: string;
  slug?: string;
}

export type UploadQueueStatus = 'pending' | 'scheduled' | 'uploaded' | 'failed';

export interface UploadQueue {
  id: string;
  assetId: string;
  scheduledDate: string | null;
  platform: string;
  status: UploadQueueStatus;
  caption: string | null;
  hashtags: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedAssetId: string | null;
  read: boolean;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
}
