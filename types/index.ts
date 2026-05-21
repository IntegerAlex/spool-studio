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
  assignedTeamMembers: string[];
  brandColor?: string;
  logo?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
}

export type AssetStatus = 'draft' | 'in_design' | 'ready_for_review' | 'revision_requested' | 'approved' | 'scheduled' | 'uploaded' | 'archived';
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
  fileUrl?: string;
  driveFileUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  thumbnailUrl?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date | null;
  assignedTo: string[];
  revisions: AssetComment[];
  comments: AssetComment[];
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
