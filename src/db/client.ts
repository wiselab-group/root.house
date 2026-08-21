import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let realDb: DrizzleDb | null = null;

/**
 * Returns the real, concrete Drizzle instance (not the lazy Proxy below).
 * Use this wherever a third-party library needs to type-introspect the
 * database object itself — e.g. @auth/drizzle-adapter's DrizzleAdapter(),
 * which does an `is(db, PgDatabase)` brand check that a Proxy wrapping a
 * plain object does not satisfy. Everywhere else, prefer the `db` export.
 */
export function getDb(): DrizzleDb {
  if (realDb) return realDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Neon database.",
    );
  }

  realDb = drizzle(neon(connectionString), { schema });
  return realDb;
}

/**
 * Lazily-resolved database client. Domain modules do `import { db } from
 * "@/db/client"` at the top of the file (readable, no ceremony at call
 * sites) — but the underlying connection, and the DATABASE_URL check, only
 * happen the first time a property on `db` is actually accessed. This keeps
 * every domain/repository module safely importable in unit tests that never
 * touch the database (e.g. relationship.service.test.ts, which only needs
 * the pure validation functions from a module that also happens to import
 * person.repository.ts), without requiring each repository file to
 * reimplement its own lazy-import workaround.
 *
 * Do NOT pass this Proxy to code that type-introspects its argument (like
 * @auth/drizzle-adapter) — use getDb() there instead.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = DrizzleDb;
