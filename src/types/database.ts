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
          monthly_goal: number | null;
          weekly_goal: number | null;
          weekly_poster_goal: number;
          weekly_reel_goal: number;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          contract_start_date: string | null;
          contract_end_date: string | null;
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
          monthly_goal?: number | null;
          weekly_goal?: number | null;
          weekly_poster_goal?: number;
          weekly_reel_goal?: number;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          contract_start_date?: string | null;
          contract_end_date?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          instagram_handle?: string | null;
          brand_color?: string | null;
          monthly_reels_target?: number;
          monthly_posts_target?: number;
          monthly_goal?: number | null;
          weekly_goal?: number | null;
          weekly_poster_goal?: number;
          weekly_reel_goal?: number;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          contract_start_date?: string | null;
          contract_end_date?: string | null;
        };
      };
      content_assets: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          type: Database['public']['Enums']['asset_type'];
          status: Database['public']['Enums']['asset_status'];
          mime_type: string | null;
          file_size: number | null;
          file_extension: string | null;
          uploaded_at: string | null;
          uploaded_by: string | null;
          drive_file_id: string | null;
          drive_file_url: string | null;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          thumbnail_url: string | null;
          media_width: number | null;
          media_height: number | null;
          duration_seconds: number | null;
          assigned_to: string | null;
          created_by: string;
          scheduled_at: string | null;
          publish_date: string | null;
          publish_time: string | null;
          scheduled_by: string | null;
          published_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
          current_revision_id: string | null;
          latest_revision_id: string | null;
          revision_count: number;
        };
        Relationships: [];
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          type: Database['public']['Enums']['asset_type'];
          status?: Database['public']['Enums']['asset_status'];
          mime_type?: string | null;
          file_size?: number | null;
          file_extension?: string | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
          drive_file_id?: string | null;
          drive_file_url?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          thumbnail_url?: string | null;
          media_width?: number | null;
          media_height?: number | null;
          duration_seconds?: number | null;
          assigned_to?: string | null;
          created_by: string;
          scheduled_at?: string | null;
          publish_date?: string | null;
          publish_time?: string | null;
          scheduled_by?: string | null;
          published_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          title?: string;
          type?: Database['public']['Enums']['asset_type'];
          status?: Database['public']['Enums']['asset_status'];
          mime_type?: string | null;
          file_size?: number | null;
          file_extension?: string | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
          drive_file_id?: string | null;
          drive_file_url?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          thumbnail_url?: string | null;
          media_width?: number | null;
          media_height?: number | null;
          duration_seconds?: number | null;
          assigned_to?: string | null;
          created_by?: string;
          scheduled_at?: string | null;
          publish_date?: string | null;
          publish_time?: string | null;
          scheduled_by?: string | null;
          published_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          current_revision_id?: string | null;
          latest_revision_id?: string | null;
          revision_count?: number;
        };
      };
      client_references: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          url: string;
          description: string | null;
          type: Database['public']['Enums']['client_reference_type'];
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          url: string;
          description?: string | null;
          type?: Database['public']['Enums']['client_reference_type'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          title?: string;
          url?: string;
          description?: string | null;
          type?: Database['public']['Enums']['client_reference_type'];
          created_at?: string;
          updated_at?: string;
        };
      };
      asset_revisions: {
        Row: {
          id: string;
          asset_id: string;
          version_number: number;
          uploaded_by: string | null;
          uploaded_at: string;
          drive_file_id: string;
          drive_file_url: string | null;
          file_size: number | null;
          mime_type: string | null;
          media_width: number | null;
          media_height: number | null;
          duration_seconds: number | null;
          change_note: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Relationships: [];
        Insert: {
          id?: string;
          asset_id: string;
          version_number?: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
          drive_file_id: string;
          drive_file_url?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          media_width?: number | null;
          media_height?: number | null;
          duration_seconds?: number | null;
          change_note?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          asset_id?: string;
          version_number?: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
          drive_file_id?: string;
          drive_file_url?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          media_width?: number | null;
          media_height?: number | null;
          duration_seconds?: number | null;
          change_note?: string | null;
          metadata?: Json | null;
          created_at?: string;
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
      client_reference_type:
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
      asset_status:
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
        | 'scheduled'
        ;
      comment_type: 'comment' | 'revision' | 'approval_note' | 'internal_note';
      revision_status: 'open' | 'resolved';
    };
    Views: Record<string, never>;
    Functions: {
      clients_weekly_counts: {
        Args: {
          week_start: string;
        };
        Returns: {
          client_id: string;
          weekly_count: number;
        }[];
      };
    };
  };
}
