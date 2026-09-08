CREATE TYPE "public"."share_link_permission" AS ENUM('VIEW_ONLY');--> statement-breakpoint
CREATE TYPE "public"."share_link_scope_type" AS ENUM('FAMILY', 'PERSON', 'BRANCH', 'STORY');--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"scope_type" "share_link_scope_type" DEFAULT 'FAMILY' NOT NULL,
	"scope_id" uuid,
	"focus_person_id" uuid NOT NULL,
	"permission" "share_link_permission" DEFAULT 'VIEW_ONLY' NOT NULL,
	"password_hash" text,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_hash_unique" ON "share_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "share_links_family_idx" ON "share_links" USING btree ("family_id");