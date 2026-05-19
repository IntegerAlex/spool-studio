export type UserRole = 'admin' | 'manager' | 'designer' | 'client';

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
  instagramHandle: string;
  monthlyDeliverables: number;
  completedDeliverables: number;
  assignedTeamMembers: string[];
  brandColor?: string;
  logo?: string;
}

export type AssetStatus = 'draft' | 'in_design' | 'ready_for_review' | 'revision_requested' | 'approved' | 'scheduled' | 'uploaded' | 'archived';
export type AssetType = 'reel' | 'poster' | 'carousel' | 'story';

export interface Asset {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;
  fileUrl?: string;
  driveFileId?: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string[];
  revisions: Revision[];
  comments: Comment[];
}

export interface Revision {
  id: string;
  assetId: string;
  version: number;
  createdBy: string;
  createdAt: Date;
  reason: string;
  fileUrl?: string;
}

export interface Comment {
  id: string;
  assetId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  replies: Comment[];
  isInternal: boolean;
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
