#!/usr/bin/env node
// Verifies byte-range support in /api/media/[mediaId] (2026-09-29, needed
// for audio: seeking, and Safari won't play audio without it): whole file
// → 200 + Accept-Ranges + Content-Length; a range → 206 with the right
// Content-Range and exactly those bytes; past the end → 416; several
// ranges at once → the whole file.
//
// Reuses the newest throwaway family from verify-lightbox-strip.mjs (created on
// demand by useLightboxFixture, deleted afterwards) and one of its uploaded photos — ranges work the same for
// any stored file.
//
// Usage: node .claude/skills/run-photos/scripts/verify-media-range.mjs

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { useLightboxFixture } from "./_test-accounts.mjs";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const fixture = await useLightboxFixture();
const { user } = fixture;
const [family] = await sql`select id from families where created_by = ${user.id} order by created_at desc limit 1`;
const [media] = await sql`select id, size_bytes from media where family_id = ${family.id} and kind = 'photo' limit 1`;

const browser = await chromium.launch();
const failures = [];
const check = (ok, label) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures.push(label);
};
try {
  const page = await (await browser.newContext({ locale: "ru-RU" })).newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", user.email);
  await page.press("#email", "Enter");
  await page.fill("#password", "test-password-123");
  await page.press("#password", "Enter");
  await page.waitForURL(/\/families/, { timeout: 15000 });

  const url = `${BASE_URL}/api/media/${media.id}?familyId=${family.id}`;
  const get = (range) =>
    page.request.get(url, range ? { headers: { Range: range } } : {});

  const whole = await get();
  const all = await whole.body();
  const size = all.length;
  check(whole.status() === 200, `whole file → 200 (${whole.status()})`);
  check(whole.headers()["accept-ranges"] === "bytes", "Accept-Ranges: bytes");
  check(Number(whole.headers()["content-length"]) === size, `Content-Length = ${size}`);
  check(size === Number(media.size_bytes), `size matches the stored ${media.size_bytes}`);

  const head2 = await get("bytes=0-1");
  check(head2.status() === 206, `bytes=0-1 → 206 (${head2.status()})`);
  check(head2.headers()["content-range"] === `bytes 0-1/${size}`, `Content-Range ${head2.headers()["content-range"]}`);
  check((await head2.body()).equals(all.subarray(0, 2)), "exactly the first 2 bytes");

  const mid = await get("bytes=100-199");
  check(mid.status() === 206 && (await mid.body()).equals(all.subarray(100, 200)), "bytes=100-199 → those 100 bytes");

  const tail = await get("bytes=-50");
  check(tail.status() === 206 && (await tail.body()).equals(all.subarray(size - 50)), "bytes=-50 → the last 50 bytes");

  const open = await get(`bytes=${size - 10}-`);
  check(open.status() === 206 && (await open.body()).length === 10, "open range to the end");

  const past = await get(`bytes=${size}-`);
  check(past.status() === 416, `past the end → 416 (${past.status()})`);
  check(past.headers()["content-range"] === `bytes */${size}`, "416 says the size");

  const multi = await get("bytes=0-1, 5-6");
  check(multi.status() === 200 && (await multi.body()).length === size, "several ranges → whole file");

  console.log(failures.length ? `\nFAILED: ${failures.length}` : "\nAll range checks pass");
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
  await fixture.release();
}
