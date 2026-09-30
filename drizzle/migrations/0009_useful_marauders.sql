CREATE TABLE "day_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"designer_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"cycle_id" uuid,
	"kind" "asset_type" NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference_ids" uuid[] DEFAULT '{}' NOT NULL,
	"result_asset_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
