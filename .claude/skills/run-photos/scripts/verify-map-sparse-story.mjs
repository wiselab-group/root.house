#!/usr/bin/env node
// Family map story on sparse data (2026-10-04): the real family «kupczyk»
// has four dated beats — a birth 1967, a birth 1988, a move 2021, a death
// 2026 — and while the story played the user saw «Галина · Смерть ·
// Пружаны» the whole time. Seeds that shape in a throwaway account, plays
// the story on desktop and phone, and records what the captions say.
//
// Usage: node .claude/skills/run-photos/scripts/verify-map-sparse-story.mjs

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteTestAccounts } from "./_test-accounts.mjs";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "map-sparse-story");
const runId = Date.now();

function check(ok, label) {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function shoot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  -> screenshots/map-sparse-story/${name}.png`);
}

async function seed(familySlug, email) {
  const [{ id: familyId }] = await sql`select id from families where slug = ${familySlug}`;
  const [{ id: userId }] = await sql`select id from users where email = ${email}`;
  const place = async (name, country, lat, lng) =>
    (await sql`insert into places (family_id, name, country, latitude, longitude)
      values (${familyId}, ${name}, ${country}, ${lat}, ${lng}) returning id`)[0].id;
  const rechki = await place("Речки", "Беларусь", 52.55, 24.6);
  const zalesye = await place("Залесье", "Беларусь", 52.7, 24.4);
  const pruzhany = await place("Пружаны", "Беларусь", 52.556, 24.457);
  const tallinn = await place("Таллинн", "Эстония", 59.437, 24.7536);
  const person = async (slug, first, o = {}) =>
    (await sql`insert into persons (family_id, slug, first_name, last_name, gender,
        is_living, birth_date_year, birth_date_precision, death_date_year, death_date_precision,
        birth_place_id, death_place_id, residence_place_id, created_by)
      values (${familyId}, ${slug}, ${first}, 'Купчик', 'unknown',
        ${o.living ?? false}, ${o.born ?? null}, ${o.born ? "year_only" : null},
        ${o.died ?? null}, ${o.died ? "year_only" : null},
        ${o.bp ?? null}, ${o.dp ?? null}, ${o.rp ?? null}, ${userId}) returning id`)[0].id;
  const galina = await person("galina", "Галина", { born: 1967, died: 2026, bp: rechki, dp: pruzhany });
  const alex = await person("alex", "Александр", { living: true, born: 1988, bp: zalesye, rp: tallinn });
  const eva = await person("eva", "Элеонора", { living: true });
  await sql`insert into relationships_parent_child (family_id, parent_id, child_id) values (${familyId}, ${galina}, ${alex})`;
  await sql`insert into relationships_partnership (family_id, person1_id, person2_id, status) values (${familyId}, ${alex}, ${eva}, 'married')`;
  const [{ id: move }] = await sql`insert into events (family_id, type, title, date_year, date_precision, place_id)
    values (${familyId}, 'migration', 'Переезд в Эстонию', 2021, 'year_only', ${tallinn}) returning id`;
  for (const p of [alex, eva]) await sql`insert into event_participants (event_id, person_id) values (${move}, ${p})`;
}

async function register(page) {
  const email = `map-sparse-${runId}@example.test`;
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#name", "Map Sparse Verifier");
  await page.fill("#email", email);
  await page.fill("#password", "verify-test-password-123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.waitForURL(/\/families$/, { timeout: 30000 });
  await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
  await page.fill("#name", "Купчик");
  await page.getByRole("button", { name: "Создать семью" }).click();
  await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 30000 });
  return { email, familySlug: new URL(page.url()).pathname.split("/")[2] };
}

async function openMap(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".maplibregl-canvas").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /^Таллинн/ }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
}

/** Every distinct caption the story shows while it plays. */
async function captions(page, seconds) {
  const seen = [];
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    const text = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-live='polite']")]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => el.textContent.trim())
        .filter(Boolean)
        .join(" | "),
    );
    if (text && seen.at(-1) !== text) seen.push(text);
    await page.waitForTimeout(120);
  }
  return seen;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const { email, familySlug } = await register(page);
    await seed(familySlug, email);
    const mapUrl = `${BASE_URL}/families/${familySlug}/map`;

    console.log("desktop");
    await openMap(page, mapUrl);
    await page.getByRole("button", { name: /Как семья сюда пришла/ }).first().click();
    const desktop = await captions(page, 14);
    console.log("  captions:", desktop);
    await shoot(page, "01-desktop-end");
    const session = await context.storageState();
    await context.close();

    console.log("phone");
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      storageState: session,
    });
    const p2 = await phone.newPage();
    await openMap(p2, mapUrl);
    await p2.getByRole("button", { name: /Как семья сюда пришла/ }).first().tap();
    await p2.waitForTimeout(1200);
    await shoot(p2, "02-phone-playing");
    const mobile = await captions(p2, 14);
    console.log("  captions:", mobile);
    await shoot(p2, "03-phone-end");
    await phone.close();

    const all = [...desktop, ...mobile];
    check(!all.some((c) => /Смерть/.test(c)), "no caption says «Смерть»");
    check(
      /Сегодня/.test(desktop.at(-1) ?? "") && /Сегодня/.test(mobile.at(-1) ?? ""),
      "the story ends on today, not on its last beat",
    );
  } finally {
    await browser.close();
    await deleteTestAccounts(runId);
  }
}

main();
