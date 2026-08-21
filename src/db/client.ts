import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Neon database.",
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
