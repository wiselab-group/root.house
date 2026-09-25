import { config } from "dotenv";

/**
 * One-off: makes the downscaled copies (see domain/media/image-variants.ts)
 * for photos uploaded before they existed. Until then such photos are
 * served as their full originals. Safe to re-run — only photos with no
 * variants yet are touched, one at a time, and the originals are never
 * modified.
 *
 *   pnpm media:backfill-variants                 # every family
 *   pnpm media:backfill-variants --family=kupczyk
 *   pnpm media:backfill-variants --dry-run       # list, change nothing
 */
async function main() {
  // Runs standalone via tsx — Next.js isn't there to load .env.local, and
  // the DB client reads DATABASE_URL on first use, so load it before any
  // module that touches the DB is imported.
  config({ path: ".env.local", quiet: true });
  const { getPhotosWithoutVariants } =
    await import("@/domain/media/media.repository");
  const { makePhotoVariants } = await import("@/domain/media/media.service");
  const { db } = await import("@/db/client");
  const { families } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const familySlug = args
    .find((arg) => arg.startsWith("--family="))
    ?.slice("--family=".length);

  let familyId: string | undefined;
  if (familySlug) {
    const [family] = await db
      .select({ id: families.id })
      .from(families)
      .where(eq(families.slug, familySlug));
    if (!family) throw new Error(`No family "${familySlug}"`);
    familyId = family.id;
  }

  const photos = await getPhotosWithoutVariants(familyId);
  const totalMb = photos.reduce((sum, p) => sum + p.sizeBytes, 0) / 1024 ** 2;
  console.log(
    `${photos.length} photo(s) without variants, ${totalMb.toFixed(1)} MB of originals${dryRun ? " (dry run)" : ""}`,
  );
  if (dryRun) return;

  let done = 0;
  let failed = 0;
  for (const [index, photo] of photos.entries()) {
    const label = `[${index + 1}/${photos.length}] ${photo.id}`;
    try {
      if (!(await makePhotoVariants(photo.id, photo.familyId))) {
        throw new Error("could not be processed");
      }
      console.log(`${label} ok`);
      done += 1;
    } catch (error) {
      console.error(
        `${label} failed:`,
        error instanceof Error ? error.message : error,
      );
      failed += 1;
    }
  }
  console.log(`Done: ${done} processed, ${failed} failed.`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
