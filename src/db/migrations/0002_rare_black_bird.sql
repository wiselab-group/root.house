-- Family slug (/family/[slug] short URL — see domain/family/slug.ts). New
-- rows always get a slug from the application (createFamily), but this
-- column is NOT NULL + globally unique, so pre-existing rows need a backfill
-- before the constraints can be added — hand-written rather than generated,
-- same reasoning as 0001_search_trgm_index.sql.
ALTER TABLE "families" ADD COLUMN "slug" text;--> statement-breakpoint

-- Deterministic, collision-free placeholder for rows created before slugs
-- existed: "family-" + first 8 hex chars of the row's own id. Real families
-- created going forward get a proper transliterated slug from the app; an
-- owner can rename this placeholder from the family dashboard at any time.
UPDATE "families" SET "slug" = 'family-' || substr("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint

ALTER TABLE "families" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "families_slug_unique" ON "families" USING btree ("slug");
