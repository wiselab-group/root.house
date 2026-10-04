import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { families } from "./family";
import { users } from "./auth";
import { persons } from "./person";

/**
 * A gap in Family Home's «Пробелы в истории» that the family has answered
 * «Мы не знаем» — nobody alive remembers, so the archive stops asking.
 * One row per person + kind (domain/family/history-gaps.ts's
 * HistoryGapKind); filling the fact in later doesn't need the row gone —
 * a known fact is never a gap anyway.
 */
export const historyGapDismissals = pgTable(
  "history_gap_dismissal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    dismissedBy: uuid("dismissed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("history_gap_dismissal_unique").on(table.personId, table.kind),
    index("history_gap_dismissal_family_idx").on(table.familyId),
    check(
      "history_gap_dismissal_kind_check",
      sql`${table.kind} in ('parents', 'birthDate', 'photo', 'birthPlace')`,
    ),
  ],
);
