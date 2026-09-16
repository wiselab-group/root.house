ALTER TABLE "media_person" ADD COLUMN "x_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "media_person" ADD COLUMN "y_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "media_person" ADD CONSTRAINT "media_person_xy_check" CHECK (("media_person"."x_percent" IS NULL) = ("media_person"."y_percent" IS NULL));