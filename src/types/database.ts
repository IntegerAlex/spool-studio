export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Database['public']['Enums']['user_role'];
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Database['public']['Enums']['user_role'];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          role?: Database['public']['Enums']['user_role'];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          slug: string;
          instagram_handle: string | null;
          brand_color: string | null;
          monthly_reels_target: number;
          monthly_posts_target: number;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          name: string;
          slug: string;
          instagram_handle?: string | null;
          brand_color?: string | null;
          monthly_reels_target?: number;
          monthly_posts_target?: number;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          instagram_handle?: string | null;
          brand_color?: string | null;
          monthly_reels_target?: number;
          monthly_posts_target?: number;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_assets: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          type: Database['public']['Enums']['asset_type'];
          status: Database['public']['Enums']['asset_status'];
          drive_file_url: string | null;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          thumbnail_url: string | null;
          assigned_to: string | null;
          created_by: string;
          scheduled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          type: Database['public']['Enums']['asset_type'];
          status?: Database['public']['Enums']['asset_status'];
          drive_file_url?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          thumbnail_url?: string | null;
          assigned_to?: string | null;
          created_by: string;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          title?: string;
          type?: Database['public']['Enums']['asset_type'];
          status?: Database['public']['Enums']['asset_status'];
          drive_file_url?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          thumbnail_url?: string | null;
          assigned_to?: string | null;
          created_by?: string;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      asset_comments: {
        Row: {
          id: string;
          asset_id: string;
          user_id: string;
          type: Database['public']['Enums']['comment_type'];
          message: string;
          revision_status: Database['public']['Enums']['revision_status'] | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          asset_id: string;
          user_id: string;
          type?: Database['public']['Enums']['comment_type'];
          message: string;
          revision_status?: Database['public']['Enums']['revision_status'] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          asset_id?: string;
          user_id?: string;
          type?: Database['public']['Enums']['comment_type'];
          message?: string;
          revision_status?: Database['public']['Enums']['revision_status'] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      asset_activity_logs: {
        Row: {
          id: string;
          asset_id: string;
          user_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          asset_id: string;
          user_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          asset_id?: string;
          user_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Enums: {
      user_role: 'admin' | 'designer' | 'approver' | 'uploader';
      asset_type: 'reel' | 'poster';
      asset_status:
        | 'draft'
        | 'in_design'
        | 'ready_for_review'
        | 'revision_requested'
        | 'approved'
        | 'scheduled'
        | 'uploaded'
        | 'archived';
      comment_type: 'comment' | 'revision' | 'approval_note' | 'internal_note';
      revision_status: 'open' | 'resolved';
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
