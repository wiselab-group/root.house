import { vercelBlobStorageService as storage } from "./storage.vercel-blob";
import { getAllReferencedStorageKeys } from "./media.repository";

/**
 * Deletes stored files no Media row points at. They appear when a browser
 * put a file into storage (lib/direct-upload.ts) but never recorded it — a
 * tab closed mid-way, a failed record call — or, rarely, when a photo was
 * deleted while its variants were being made.
 *
 * Only this app's own direct-upload folders are considered —
 * `<familyId>/uploads/` and `<familyId>/variants/` — never older
 * server-uploaded originals or anything else in the store. And only files
 * older than `olderThanMs`: a fresh upload is legitimately unreferenced for
 * the few seconds between landing in storage and being recorded.
 */
const MANAGED_KEY = /^[0-9a-f-]{36}\/(uploads|variants)\//;
export const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

export async function cleanupOrphanedUploads({
  olderThanMs = ORPHAN_MIN_AGE_MS,
  dryRun = false,
}: { olderThanMs?: number; dryRun?: boolean } = {}): Promise<{
  scanned: number;
  orphaned: string[];
}> {
  const referenced = await getAllReferencedStorageKeys();
  const cutoff = Date.now() - olderThanMs;
  const orphaned: string[] = [];
  let scanned = 0;

  for await (const file of storage.listFiles()) {
    if (!MANAGED_KEY.test(file.storageKey)) continue;
    scanned += 1;
    if (referenced.has(file.storageKey)) continue;
    if (file.uploadedAt.getTime() > cutoff) continue;
    orphaned.push(file.storageKey);
  }

  if (!dryRun) {
    for (const key of orphaned) await storage.delete(key);
  }
  return { scanned, orphaned };
}
