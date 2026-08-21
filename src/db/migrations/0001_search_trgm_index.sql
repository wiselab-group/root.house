-- Fuzzy/typo-tolerant name search for persons (see docs/architecture.md § Search).
-- Drizzle has no declarative builder for trigram indexes, so this ships as a
-- hand-written migration rather than being generated from src/db/schema.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS persons_name_trgm_idx ON persons
  USING gin (
    (coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(maiden_name, ''))
    gin_trgm_ops
  );
