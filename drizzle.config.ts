import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local automatically; standalone scripts like this one
// (run outside the Next.js process) need to load it explicitly — plain
// `dotenv/config` only reads `.env` by default.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
