import { config } from "dotenv";

/**
 * Manual run of the daily orphaned-upload cleanup (the same code the
 * /api/cron/cleanup-uploads job runs — see domain/media/media-cleanup.ts).
 *
 *   pnpm media:cleanup-orphans --dry-run   # list, delete nothing
 *   pnpm media:cleanup-orphans
 */
async function main() {
  // Standalone via tsx — load .env.local before the DB client is imported.
  config({ path: ".env.local", quiet: true });
  const { cleanupOrphanedUploads } =
    await import("@/domain/media/media-cleanup");

  const dryRun = process.argv.includes("--dry-run");
  const { scanned, orphaned } = await cleanupOrphanedUploads({ dryRun });
  for (const key of orphaned)
    console.log(`${dryRun ? "would delete" : "deleted"} ${key}`);
  console.log(
    `${scanned} managed file(s) scanned, ${orphaned.length} orphaned${dryRun ? " (dry run)" : " deleted"}.`,
  );
}

main().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
