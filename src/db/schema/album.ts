import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { families } from "./family";

/**
 * Album — a user-defined grouping of photos ("Свадьба 1978", "Дача 2005"),
 * layered on top of the flat family gallery rather than replacing it. A
 * photo can belong to several albums at once (see media_album in media.ts)
 * or none — albums are pure organization, never a required field on Media.
 */
export const albums = pgTable(
  "albums",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("albums_family_idx").on(table.familyId)],
);
