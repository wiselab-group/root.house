CREATE TABLE "history_gap_dismissal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"dismissed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "history_gap_dismissal_kind_check" CHECK ("history_gap_dismissal"."kind" in ('parents', 'birthDate', 'photo', 'birthPlace'))
);
--> statement-breakpoint
ALTER TABLE "history_gap_dismissal" ADD CONSTRAINT "history_gap_dismissal_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_gap_dismissal" ADD CONSTRAINT "history_gap_dismissal_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_gap_dismissal" ADD CONSTRAINT "history_gap_dismissal_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "history_gap_dismissal_unique" ON "history_gap_dismissal" USING btree ("person_id","kind");--> statement-breakpoint
CREATE INDEX "history_gap_dismissal_family_idx" ON "history_gap_dismissal" USING btree ("family_id");