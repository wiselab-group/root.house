CREATE TYPE "public"."story_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "story_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "status" "story_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_drafts" ADD CONSTRAINT "story_drafts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_drafts" ADD CONSTRAINT "story_drafts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_drafts" ADD CONSTRAINT "story_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "story_drafts_story_user_unique" ON "story_drafts" USING btree ("story_id","user_id");--> statement-breakpoint
CREATE INDEX "stories_family_status_author_idx" ON "stories" USING btree ("family_id","status","author_id");