-- Story slug (/families/[slug]/stories/[slug] — see domain/story/slug.ts).
-- New rows always get a slug from the application (story.service.ts), but
-- this column is NOT NULL + unique per family, so pre-existing rows need a
-- backfill before the constraints can be added — hand-written rather than
-- generated, same reasoning as 0003_striped_prowler.sql (persons.slug).
ALTER TABLE "stories" ADD COLUMN "slug" text;--> statement-breakpoint

-- Deterministic, collision-free placeholder for rows created before slugs
-- existed: "story-" + first 8 hex chars of the row's own id. Real stories
-- created going forward get a proper title-derived slug from the app.
UPDATE "stories" SET "slug" = 'story-' || substr("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint

ALTER TABLE "stories" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stories_family_slug_unique" ON "stories" USING btree ("family_id","slug");
