-- Person slug (/families/[slug]/people/[slug] — see domain/person/slug.ts).
-- New rows always get a slug from the application (person.service.ts), but
-- this column is NOT NULL + unique per family, so pre-existing rows need a
-- backfill before the constraints can be added — hand-written rather than
-- generated, same reasoning as 0002_rare_black_bird.sql (families.slug).
ALTER TABLE "persons" ADD COLUMN "slug" text;--> statement-breakpoint

-- Deterministic, collision-free placeholder for rows created before slugs
-- existed: "person-" + first 8 hex chars of the row's own id. Real people
-- created going forward get a proper name-derived slug from the app; the
-- app also lets a person's slug be renamed later (person.service.ts::renamePersonSlug)
-- for anyone who wants a nicer URL than this backfilled default.
UPDATE "persons" SET "slug" = 'person-' || substr("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint

ALTER TABLE "persons" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "persons_family_slug_unique" ON "persons" USING btree ("family_id","slug");
