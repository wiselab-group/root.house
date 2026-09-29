CREATE TYPE "public"."voice_speaker" AS ENUM('self', 'narrator');--> statement-breakpoint
CREATE TABLE "person_voice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"speaker" "voice_speaker" DEFAULT 'self' NOT NULL,
	"narrator_name" text,
	"title" text,
	"recorded_date_year" smallint,
	"recorded_date_month" smallint,
	"recorded_date_day" smallint,
	"recorded_date_precision" text,
	"recorded_date_approximate" boolean,
	"duration_ms" integer NOT NULL,
	"peaks" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"added_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person_voice" ADD CONSTRAINT "person_voice_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_voice" ADD CONSTRAINT "person_voice_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_voice" ADD CONSTRAINT "person_voice_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_voice" ADD CONSTRAINT "person_voice_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "person_voice_media_unique" ON "person_voice" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "person_voice_person_idx" ON "person_voice" USING btree ("person_id","position");--> statement-breakpoint
CREATE INDEX "person_voice_family_idx" ON "person_voice" USING btree ("family_id");