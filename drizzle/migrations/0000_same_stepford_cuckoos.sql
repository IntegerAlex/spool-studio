CREATE TYPE "public"."asset_status" AS ENUM('draft', 'uploading', 'uploaded', 'processing', 'approved', 'published', 'failed', 'archived', 'in_design', 'ready_for_review', 'revision_requested', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('reel', 'poster');--> statement-breakpoint
CREATE TYPE "public"."client_reference_type" AS ENUM('instagram', 'website', 'youtube', 'pinterest', 'drive_folder', 'competitor', 'branding', 'reel_reference', 'ad_reference', 'other');--> statement-breakpoint
CREATE TYPE "public"."comment_type" AS ENUM('comment', 'revision', 'approval_note', 'internal_note');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'designer', 'approver', 'uploader');--> statement-breakpoint
CREATE TABLE "asset_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "comment_type" DEFAULT 'comment' NOT NULL,
	"message" text NOT NULL,
	"revision_status" "revision_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"drive_file_id" text NOT NULL,
	"drive_file_url" text,
	"file_size" integer,
	"mime_type" text,
	"media_width" integer,
	"media_height" integer,
	"duration_seconds" double precision,
	"change_note" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_email" text,
	"user_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"entity_name" text,
	"metadata" jsonb DEFAULT '{}',
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"type" "client_reference_type" DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"instagram_handle" text,
	"brand_color" text,
	"monthly_reels_target" integer DEFAULT 0 NOT NULL,
	"monthly_posts_target" integer DEFAULT 0 NOT NULL,
	"monthly_goal" integer DEFAULT 0 NOT NULL,
	"weekly_goal" integer DEFAULT 0 NOT NULL,
	"weekly_poster_goal" integer DEFAULT 0 NOT NULL,
	"weekly_reel_goal" integer DEFAULT 0 NOT NULL,
	"contract_start_date" date,
	"contract_end_date" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"drive_folder_id" text,
	"drive_folder_url" text,
	CONSTRAINT "clients_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"status" "asset_status" DEFAULT 'draft' NOT NULL,
	"drive_file_url" text,
	"drive_file_id" text,
	"drive_folder_id" text,
	"drive_folder_url" text,
	"thumbnail_url" text,
	"assigned_to" uuid,
	"created_by" uuid NOT NULL,
	"scheduled_at" timestamp with time zone,
	"mime_type" text,
	"file_size" integer,
	"file_extension" text,
	"uploaded_at" timestamp with time zone,
	"uploaded_by" uuid,
	"media_width" integer,
	"media_height" integer,
	"duration_seconds" double precision,
	"current_revision_id" uuid,
	"latest_revision_id" uuid,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"publish_date" date,
	"publish_time" time,
	"scheduled_by" uuid,
	"published_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recurrence" jsonb
);
--> statement-breakpoint
CREATE TABLE "_migrations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "_migrations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"filename" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "_migrations_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_tokens" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"client_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "portal_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"scheduled_date" timestamp with time zone,
	"platform" text,
	"caption" text,
	"hashtags" text,
	"recurrence" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_notification_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_on_asset_uploaded" boolean DEFAULT true NOT NULL,
	"email_on_revision_requested" boolean DEFAULT true NOT NULL,
	"email_on_comment_added" boolean DEFAULT true NOT NULL,
	"email_on_approval_decision" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'designer' NOT NULL,
	"avatar_url" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'My Workspace' NOT NULL,
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
