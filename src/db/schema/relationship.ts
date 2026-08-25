import { pgTable, text, timestamp, uuid, smallint, boolean, index, uniqueIndex, check, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { families } from "./family";
import { persons } from "./person";

export const parentRoleEnum = pgEnum("parent_role", ["biological", "adoptive", "step", "foster", "unknown"]);
export const partnershipStatusEnum = pgEnum("partnership_status", [
  "married",
  "divorced",
  "widowed",
  "partnered",
  "separated",
]);

/**
 * relationships_parent_child — the ONE stored direction of parentage
 * (parent -> child). "Child of" is never stored separately; it's just this
 * same row read from the other side. Sibling relationships are not stored at
 * all — they're derived by joining this table against itself on a shared
 * parentId (see graph.service.ts).
 */
export const relationshipsParentChild = pgTable(
  "relationships_parent_child",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    parentRole: parentRoleEnum("parent_role").notNull().default("biological"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("parent_child_unique").on(table.parentId, table.childId),
    index("parent_child_child_idx").on(table.childId), // "who are my parents" — ancestors
    index("parent_child_parent_idx").on(table.parentId), // "who are my children" — descendants
    check("parent_child_no_self_reference", sql`${table.parentId} <> ${table.childId}`),
  ],
);

/**
 * relationships_partnership — spouse/partner union, direction-neutral
 * (person1/person2, no "husband"/"wife" slots since gender isn't always
 * binary and this keeps the schema upsert-friendly). Deliberately no
 * unique(person1Id, person2Id): a divorced-then-remarried couple is just two
 * rows with different start/end dates.
 */
export const relationshipsPartnership = pgTable(
  "relationships_partnership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    person1Id: uuid("person1_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    person2Id: uuid("person2_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    status: partnershipStatusEnum("status").notNull().default("partnered"),

    startDateYear: smallint("start_date_year"),
    startDateMonth: smallint("start_date_month"),
    startDateDay: smallint("start_date_day"),
    startDatePrecision: text("start_date_precision"),
    startDateApproximate: boolean("start_date_approximate"),

    endDateYear: smallint("end_date_year"),
    endDateMonth: smallint("end_date_month"),
    endDateDay: smallint("end_date_day"),
    endDatePrecision: text("end_date_precision"),
    endDateApproximate: boolean("end_date_approximate"),

    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("partnership_person1_idx").on(table.person1Id),
    index("partnership_person2_idx").on(table.person2Id),
    check("partnership_no_self_reference", sql`${table.person1Id} <> ${table.person2Id}`),
  ],
);
