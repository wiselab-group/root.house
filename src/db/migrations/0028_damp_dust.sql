ALTER TABLE "stories" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
-- Stories published before this column existed: their creation time is the
-- closest known date (most were created already published).
UPDATE "stories" SET "published_at" = "created_at" WHERE "status" = 'published';
