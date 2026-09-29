CREATE TABLE "story_narration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"recorded_by" uuid,
	"cues" jsonb NOT NULL,
	"duration_ms" integer NOT NULL,
	"body_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_narration" ADD CONSTRAINT "story_narration_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_narration" ADD CONSTRAINT "story_narration_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_narration" ADD CONSTRAINT "story_narration_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_narration" ADD CONSTRAINT "story_narration_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "story_narration_story_unique" ON "story_narration" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_narration_media_unique" ON "story_narration" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "story_narration_family_idx" ON "story_narration" USING btree ("family_id");