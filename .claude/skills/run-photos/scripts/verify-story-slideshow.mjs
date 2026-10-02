#!/usr/bin/env node
// Verifies the Story hero slideshow without a play button (2026-09-29):
// the progress ring sits on «Все фото», photos advance by themselves, the
// slideshow holds while the mouse is over the film bar and resumes after,
// and under prefers-reduced-motion there's no ring and no autoplay.
//
// Reuses the newest throwaway family from verify-lightbox-strip.mjs (created on
// demand by useLightboxFixture, deleted afterwards): logs in as its account and adds, with SQL scoped to that
// family, a story whose photos are the family's uploaded photos.
//
// Usage: node .claude/skills/run-photos/scripts/verify-story-slideshow.mjs
// Requires: dev server at BASE_URL (default http://localhost:3000) and
// DATABASE_URL in .env.local.

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useLightboxFixture } from "./_test-accounts.mjs";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "story-slideshow");

const fixture = await useLightboxFixture();
const { user } = fixture;
const [family] = await sql`select id, slug from families where created_by = ${user.id} order by created_at desc limit 1`;
const media = await sql`select id from media where family_id = ${family.id} and kind = 'photo' order by created_at`;
const storySlug = `slideshow-${Date.now()}`;
const [story] = await sql`insert into stories (family_id, slug, title, body, author_id)
  values (${family.id}, ${storySlug}, 'История знакомства', 'Как мы познакомились', ${user.id}) returning id`;
for (const [i, m] of media.entries()) {
  await sql`insert into media_story (media_id, story_id, position) values (${m.id}, ${story.id}, ${i})`;
}

const hideDevOverlay = (page) =>
  page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style));
  });
const current = (page) =>
  // The film bar's own thumbnail group — the header's RU/EN switch is a
  // role="group" too.
  page.evaluate(() =>
    [
      ...document.querySelectorAll('[role="group"][aria-label="Фото истории"] button'),
    ].findIndex((b) => b.getAttribute("aria-pressed") === "true"),
  );
const shoot = async (page, name) => {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ru-RU" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await hideDevOverlay(page);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", user.email);
  await page.press("#email", "Enter");
  await page.fill("#password", "test-password-123");
  await page.press("#password", "Enter");
  await page.waitForURL(/\/families/, { timeout: 15000 });

  const url = `${BASE_URL}/families/${family.slug}/stories/${storySlug}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.mouse.move(640, 200); // over the photo, not the film bar
  if ((await page.getByRole("button", { name: /Слайдшоу|Остановить/ }).count()) > 0)
    throw new Error("the play/pause button is still there");
  const ring = page.getByRole("button", { name: "Все фото" }).locator("circle");
  if ((await ring.count()) !== 1) throw new Error("no progress ring on «Все фото»");
  await shoot(page, "01-ring-on-all-photos");

  const a = await current(page);
  await page.waitForTimeout(6800);
  const b = await current(page);
  if (a === b) throw new Error(`slideshow did not advance (${a} → ${b})`);
  console.log(`    advances by itself: ${a} → ${b}`);

  await page.getByRole("button", { name: "Все фото" }).hover();
  const c = await current(page);
  await page.waitForTimeout(7000);
  const d = await current(page);
  if (c !== d) throw new Error(`did not hold under the mouse (${c} → ${d})`);
  console.log(`    holds while the mouse is over the film bar: ${c} → ${d}`);
  await shoot(page, "02-held-under-mouse");

  await page.mouse.move(640, 200);
  await page.waitForTimeout(7000);
  const e = await current(page);
  if (e === d) throw new Error(`did not resume after the mouse left (${d} → ${e})`);
  console.log(`    resumes after the mouse leaves: ${d} → ${e}`);

  const calm = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ru-RU",
    reducedMotion: "reduce",
    storageState: await ctx.storageState(),
  });
  const cp = await calm.newPage();
  await hideDevOverlay(cp);
  await cp.goto(url, { waitUntil: "networkidle" });
  const rings = await cp.getByRole("button", { name: "Все фото" }).locator("circle").count();
  const f = await current(cp);
  await cp.waitForTimeout(7000);
  const g = await current(cp);
  if (rings !== 0 || f !== g) throw new Error(`reduced motion: rings=${rings}, ${f} → ${g}`);
  console.log("    reduced motion: no ring, no autoplay");
  await shoot(cp, "03-reduced-motion");
  console.log("\nErrors:", errors.length ? errors : "none");
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.log("Errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fixture.release();
}
