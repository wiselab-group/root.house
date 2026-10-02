// Cleanup for the throwaway accounts these verify-*.mjs scripts register.
// They run against the shared Neon DB (the same one production reads), so
// every run must leave nothing behind:
//
//   finally { await browser.close(); await deleteTestAccounts(runId); }
//
// Deletes only `@example.test` accounts (hard guard in SQL), plus every
// family whose members are ALL such accounts (content cascades) and those
// families' files in Vercel Blob (`<familyId>/…`). A family with any real
// member is never touched. Set KEEP_TEST_ACCOUNT=1 to keep a run's data for
// poking at it by hand; purge-test-accounts.mjs sweeps leftovers from runs
// that were killed before their `finally` ran.

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { list, del } from "@vercel/blob";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
config({ path: path.join(repoRoot, ".env.local"), quiet: true });

const sql = neon(process.env.DATABASE_URL);
const keep = () => process.env.KEEP_TEST_ACCOUNT === "1";

/** Deletes `@example.test` accounts whose email matches the LIKE pattern. */
async function deleteMatching(emailPattern) {
  const users = await sql`
    select id from users
    where email like ${emailPattern} and email like '%@example.test'`;
  if (users.length === 0) return { users: 0, families: 0, files: 0 };
  const ids = users.map((u) => u.id);

  const families = await sql`
    select f.id from families f
    where exists (select 1 from family_members fm
                  where fm.family_id = f.id and fm.user_id = any(${ids}::uuid[]))
      and not exists (select 1 from family_members fm join users u on u.id = fm.user_id
                      where fm.family_id = f.id and u.email not like '%@example.test')`;
  const familyIds = families.map((f) => f.id);

  if (familyIds.length > 0) {
    await sql`delete from families where id = any(${familyIds}::uuid[])`;
  }
  await sql`delete from users where id = any(${ids}::uuid[])`;

  // Files last: an orphaned file is harmless, a row without its file isn't.
  let files = 0;
  for (const familyId of familyIds) {
    let cursor;
    do {
      const page = await list({ prefix: `${familyId}/`, cursor, limit: 1000 });
      if (page.blobs.length > 0) {
        await del(page.blobs.map((b) => b.url));
        files += page.blobs.length;
      }
      cursor = page.cursor;
    } while (cursor);
  }
  return { users: ids.length, families: familyIds.length, files };
}

/** Every account this run registered — their emails all end in `-<runId>@example.test`. */
export async function deleteTestAccounts(runId) {
  if (keep()) {
    console.log(`KEEP_TEST_ACCOUNT=1 — leaving run ${runId}'s test data in place`);
    return;
  }
  try {
    const r = await deleteMatching(`%-${runId}@example.test`);
    console.log(`cleanup: ${r.users} test account(s), ${r.families} family(ies), ${r.files} file(s) deleted`);
  } catch (error) {
    console.error("cleanup failed — run purge-test-accounts.mjs:", error);
    process.exitCode = 1;
  }
}

/** All `@example.test` accounts — for purge-test-accounts.mjs. */
export function purgeAllTestAccounts() {
  return deleteMatching("%@example.test");
}

/**
 * For scripts that reuse verify-lightbox-strip.mjs's family (photos, a
 * person, an album). Uses a kept one if present; otherwise runs that script
 * with KEEP_TEST_ACCOUNT=1 to set one up, and `release()` deletes it again.
 */
export async function useLightboxFixture() {
  const find = async () =>
    (await sql`select id, email from users where email like 'lightbox-strip-%@example.test'
               order by created_at desc limit 1`)[0];
  let user = await find();
  const created = !user;
  if (created) {
    console.log("no lightbox-strip fixture — running verify-lightbox-strip.mjs to create one");
    const run = spawnSync(process.execPath, [path.join(here, "verify-lightbox-strip.mjs")], {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, KEEP_TEST_ACCOUNT: "1" },
    });
    user = await find();
    if (run.status !== 0 || !user) throw new Error("verify-lightbox-strip.mjs failed to set up the fixture");
  }
  return {
    user,
    async release() {
      if (!created || keep()) return;
      const runId = user.email.match(/-(\d+)@example\.test$/)?.[1];
      if (runId) await deleteTestAccounts(runId);
    },
  };
}
