ALTER TABLE "persons" ALTER COLUMN "gender" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "persons" ALTER COLUMN "gender" SET DEFAULT 'unknown'::text;--> statement-breakpoint
DROP TYPE "public"."gender";--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
ALTER TABLE "persons" ALTER COLUMN "gender" SET DEFAULT 'unknown'::"public"."gender";--> statement-breakpoint
ALTER TABLE "persons" ALTER COLUMN "gender" SET DATA TYPE "public"."gender" USING "gender"::"public"."gender";