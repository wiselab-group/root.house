import type { Locale } from "@/domain/shared/locale";
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/**
 * Auth.js (NextAuth v5) Drizzle adapter schema — table names/shapes follow
 * @auth/drizzle-adapter's expected contract. These tables hold ONLY identity
 * data; no domain (genealogy) fields belong here.
 */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"), // set only for the Credentials provider
  // Explicit UI language choice ("ru" | "en"); null = follow the browser.
  // Copied into the NEXT_LOCALE cookie at sign-in so it follows the user
  // across devices — see src/i18n/sync-locale.ts.
  locale: text("locale").$type<Locale>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Stamped by Auth.js `events.signIn` (lib/auth.ts) — sessions are JWT, so
  // the `sessions` table stays empty and can't answer "when did they last
  // sign in". Shown only on /admin.
  lastSignInAt: timestamp("last_sign_in_at", { mode: "date" }),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);
