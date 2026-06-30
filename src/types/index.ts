import type { Database } from './database';

export type UserRole = Database['public']['Enums']['user_role'];
export type AssetType = Database['public']['Enums']['asset_type'];
export type AssetStatus = Database['public']['Enums']['asset_status'];
export type CommentType = Database['public']['Enums']['comment_type'];
export type RevisionStatus = Database['public']['Enums']['revision_status'];
export type ClientReferenceType = Database['public']['Enums']['client_reference_type'];

export type User = Database['public']['Tables']['users']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Asset = Database['public']['Tables']['content_assets']['Row'];
export type AssetComment = Database['public']['Tables']['asset_comments']['Row'];
export type AssetActivityLog = Database['public']['Tables']['asset_activity_logs']['Row'];
export type AssetRevision = Database['public']['Tables']['asset_revisions']['Row'];
export type ClientReference = Database['public']['Tables']['client_references']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type AssetInsert = Database['public']['Tables']['content_assets']['Insert'];

export interface KanbanClientOption {
  id: string;
  name: string;
  slug: string;
}

export interface UploadQueue {
  asset: Asset;
  client: Client;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
}
