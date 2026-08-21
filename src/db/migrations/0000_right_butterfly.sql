CREATE TYPE "public"."privacy_level" AS ENUM('private', 'family', 'public');--> statement-breakpoint
CREATE TYPE "public"."family_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('free');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'unknown', 'other');--> statement-breakpoint
CREATE TYPE "public"."parent_role" AS ENUM('biological', 'adoptive', 'step', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."partnership_status" AS ENUM('married', 'divorced', 'widowed', 'partnered', 'separated');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('birth', 'death', 'marriage', 'divorce', 'baptism', 'migration', 'emigration', 'education', 'military_service', 'war', 'occupation', 'imprisonment', 'other');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('photo', 'video', 'audio', 'document');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"plan_tier" "plan_tier" DEFAULT 'free' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "family_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"country" text,
	"region" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"first_name" text,
	"last_name" text,
	"middle_name" text,
	"maiden_name" text,
	"nickname" text,
	"gender" "gender" DEFAULT 'unknown' NOT NULL,
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"is_living" boolean DEFAULT true NOT NULL,
	"birth_date_year" smallint,
	"birth_date_month" smallint,
	"birth_date_day" smallint,
	"birth_date_precision" text,
	"birth_date_approximate" boolean,
	"death_date_year" smallint,
	"death_date_month" smallint,
	"death_date_day" smallint,
	"death_date_precision" text,
	"death_date_approximate" boolean,
	"birth_place_id" uuid,
	"death_place_id" uuid,
	"description" text,
	"religion" text,
	"nationality" text,
	"photo_media_id" uuid,
	"privacy_level" "privacy_level" DEFAULT 'family' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships_parent_child" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"parent_role" "parent_role" DEFAULT 'biological' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parent_child_no_self_reference" CHECK ("relationships_parent_child"."parent_id" <> "relationships_parent_child"."child_id")
);
--> statement-breakpoint
CREATE TABLE "relationships_partnership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"person1_id" uuid NOT NULL,
	"person2_id" uuid NOT NULL,
	"status" "partnership_status" DEFAULT 'partnered' NOT NULL,
	"start_date_year" smallint,
	"start_date_month" smallint,
	"start_date_day" smallint,
	"start_date_precision" text,
	"start_date_approximate" boolean,
	"end_date_year" smallint,
	"end_date_month" smallint,
	"end_date_day" smallint,
	"end_date_precision" text,
	"end_date_approximate" boolean,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partnership_no_self_reference" CHECK ("relationships_partnership"."person1_id" <> "relationships_partnership"."person2_id")
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date_year" smallint,
	"date_month" smallint,
	"date_day" smallint,
	"date_precision" text,
	"date_approximate" boolean,
	"end_date_year" smallint,
	"end_date_month" smallint,
	"end_date_day" smallint,
	"end_date_precision" text,
	"end_date_approximate" boolean,
	"place_id" uuid,
	"privacy_level" "privacy_level" DEFAULT 'family' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"privacy_level" "privacy_level" DEFAULT 'family' NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"event_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"person_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"place_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"storage_provider" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"title" text,
	"description" text,
	"document_metadata" jsonb,
	"privacy_level" "privacy_level" DEFAULT 'family' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"event_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"person_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"place_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_story" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"story_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_birth_place_id_places_id_fk" FOREIGN KEY ("birth_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_death_place_id_places_id_fk" FOREIGN KEY ("death_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships_parent_child" ADD CONSTRAINT "relationships_parent_child_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships_parent_child" ADD CONSTRAINT "relationships_parent_child_parent_id_persons_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships_parent_child" ADD CONSTRAINT "relationships_parent_child_child_id_persons_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships_partnership" ADD CONSTRAINT "relationships_partnership_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships_partnership" ADD CONSTRAINT "relationships_partnership_person1_id_persons_id_fk" FOREIGN KEY ("person1_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships_partnership" ADD CONSTRAINT "relationships_partnership_person2_id_persons_id_fk" FOREIGN KEY ("person2_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_event" ADD CONSTRAINT "story_event_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_event" ADD CONSTRAINT "story_event_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_person" ADD CONSTRAINT "story_person_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_person" ADD CONSTRAINT "story_person_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_place" ADD CONSTRAINT "story_place_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_place" ADD CONSTRAINT "story_place_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_event" ADD CONSTRAINT "media_event_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_event" ADD CONSTRAINT "media_event_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_person" ADD CONSTRAINT "media_person_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_person" ADD CONSTRAINT "media_person_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_place" ADD CONSTRAINT "media_place_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_place" ADD CONSTRAINT "media_place_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_story" ADD CONSTRAINT "media_story_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_story" ADD CONSTRAINT "media_story_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "family_members_family_user_unique" ON "family_members" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE INDEX "family_members_user_idx" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "family_members_family_idx" ON "family_members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "places_family_idx" ON "places" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "persons_family_idx" ON "persons" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "persons_family_name_idx" ON "persons" USING btree ("family_id","last_name","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_child_unique" ON "relationships_parent_child" USING btree ("parent_id","child_id");--> statement-breakpoint
CREATE INDEX "parent_child_child_idx" ON "relationships_parent_child" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "parent_child_parent_idx" ON "relationships_parent_child" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "partnership_person1_idx" ON "relationships_partnership" USING btree ("person1_id");--> statement-breakpoint
CREATE INDEX "partnership_person2_idx" ON "relationships_partnership" USING btree ("person2_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_participants_unique" ON "event_participants" USING btree ("event_id","person_id","role");--> statement-breakpoint
CREATE INDEX "event_participants_person_idx" ON "event_participants" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "events_family_type_idx" ON "events" USING btree ("family_id","type");--> statement-breakpoint
CREATE INDEX "events_family_year_idx" ON "events" USING btree ("family_id","date_year");--> statement-breakpoint
CREATE INDEX "stories_family_idx" ON "stories" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_event_unique" ON "story_event" USING btree ("story_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_person_unique" ON "story_person" USING btree ("story_id","person_id");--> statement-breakpoint
CREATE INDEX "story_person_person_idx" ON "story_person" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_place_unique" ON "story_place" USING btree ("story_id","place_id");--> statement-breakpoint
CREATE INDEX "media_family_idx" ON "media" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_event_unique" ON "media_event" USING btree ("media_id","event_id");--> statement-breakpoint
CREATE INDEX "media_event_event_idx" ON "media_event" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_person_unique" ON "media_person" USING btree ("media_id","person_id");--> statement-breakpoint
CREATE INDEX "media_person_person_idx" ON "media_person" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_place_unique" ON "media_place" USING btree ("media_id","place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_story_unique" ON "media_story" USING btree ("media_id","story_id");