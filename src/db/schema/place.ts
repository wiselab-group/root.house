import { pgTable, text, timestamp, uuid, numeric, index } from "drizzle-orm/pg-core";
import { families } from "./family";

/**
 * Place — birth/death/residence/work/military/migration/event locations.
 * Geo fields are optional and nullable on purpose: no map UI in MVP, but the
 * schema doesn't block adding one later without a migration.
 */
export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    country: text("country"),
    region: text("region"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("places_family_idx").on(table.familyId)],
);
