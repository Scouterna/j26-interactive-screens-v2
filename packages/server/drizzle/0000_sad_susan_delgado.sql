CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"scanner_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"accepted" boolean NOT NULL,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tag_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" text NOT NULL,
	"display_name" text NOT NULL,
	"lat" numeric NOT NULL,
	"lng" numeric NOT NULL,
	CONSTRAINT "tag_mappings_tag_id_unique" UNIQUE("tag_id")
);
--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;