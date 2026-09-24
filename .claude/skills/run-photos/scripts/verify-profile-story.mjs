#!/usr/bin/env node
// Visually verifies the dark photo-backdrop Person Profile (hero, desktop
// tabs / phone «Содержание», family list) and the Story page (hero
// carousel), on a throwaway family that mirrors the SHAPE of the real
// Александр Купчик record (family "kupczyk") without touching it:
// a male person born 1988 with birthplace/nationality/religion, a
// light-background avatar, 2 parents, a spouse with her own avatar, 1 child,
// 1 event, and a one-line story «История любви» tagged with him and his
// wife and no photos of its own (so the carousel falls back to their
// portraits).
//
// Accounts/family/people that need file uploads go through the real UI
// (register, create family, create person with avatar); the rest of the
// structure is inserted with SQL — scoped to this run's own new family id.
//
// Usage: node .claude/skills/run-photos/scripts/verify-profile-story.mjs
// Requires: dev server at BASE_URL (default http://localhost:3000),
// DATABASE_URL in .env.local, and two portrait JPEGs passed as
// AVATAR_A / AVATAR_B env vars (any light-background portraits).

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "profile-story");
const runId = Date.now();

async function createPerson(page, familySlug, first, last, avatar) {
  await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
    waitUntil: "networkidle",
  });
  await page.locator('input[type="file"]').first().setInputFiles(avatar);
  await page.locator('img[alt=""]').first().waitFor({ timeout: 8000 });
  await page.fill("#firstName", first);
  await page.fill("#lastName", last);
  await page.getByRole("button", { name: "Добавить" }).click();
  await page.waitForURL(/\/people\/(?!new$)[^/]+$/, { timeout: 20000 });
  return new URL(page.url()).pathname.split("/").pop();
}

async function seed(familySlug, alexSlug, eleSlug) {
  const [fam] = await sql`select id from families where slug=${familySlug}`;
  const f = fam.id;
  const [alex] = await sql`select id, created_by from persons where family_id=${f} and slug=${alexSlug}`;
  const [ele] = await sql`select id from persons where family_id=${f} and slug=${eleSlug}`;
  const by = alex.created_by;
  const [place] = await sql`insert into places (family_id, name) values (${f}, 'Минск') returning id`;
  await sql`update persons set middle_name='Викторович', gender='male', birth_date_year=1988, birth_date_precision='year_only', birth_place_id=${place.id}, nationality='Белорус', religion='Протестантизм' where id=${alex.id}`;
  await sql`update persons set gender='female', birth_date_year=1990, birth_date_precision='year_only' where id=${ele.id}`;
  const mk = async (slug, first, gender, year) =>
    (await sql`insert into persons (family_id, slug, first_name, last_name, gender, birth_date_year, birth_date_precision, created_by)
      values (${f}, ${slug}, ${first}, 'Купчик', ${gender}, ${year}, 'year_only', ${by}) returning id`)[0].id;
  const viktor = await mk("viktor", "Виктор", "male", 1961);
  const galina = await mk("galina", "Галина", "female", 1963);
  const child = await mk("eva", "Ева", "female", 2016);
  for (const parent of [viktor, galina])
    await sql`insert into relationships_parent_child (family_id, parent_id, child_id) values (${f}, ${parent}, ${alex.id})`;
  for (const parent of [alex.id, ele.id])
    await sql`insert into relationships_parent_child (family_id, parent_id, child_id) values (${f}, ${parent}, ${child})`;
  await sql`insert into relationships_partnership (family_id, person1_id, person2_id, is_current) values (${f}, ${alex.id}, ${ele.id}, true)`;
  const [ev] = await sql`insert into events (family_id, type, title, date_year, date_precision, created_by) values (${f}, 'migration', 'Переезд в Эстонию', 2021, 'year_only', ${by}) returning id`;
  await sql`insert into event_participants (event_id, person_id, role) values (${ev.id}, ${alex.id}, 'subject')`;
  const [story] = await sql`insert into stories (family_id, slug, title, body, author_id) values (${f}, ${"istoriya-lyubvi-" + runId}, 'История любви', 'Как мы познакомились', ${by}) returning slug, id`;
  for (const p of [alex.id, ele.id])
    await sql`insert into story_person (story_id, person_id) values (${story.id}, ${p})`;
  return story.slug;
}

async function shoot(page, name, fullPage = false) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const key = m.args()[1] ? m.args()[1].toString() : "";
    errors.push(`console @ ${new URL(page.url()).pathname}: ${m.text().slice(0, 60)} ${key}`);
  });
  try {
    console.log("1/5 register + family");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Profile Story Verifier");
    await page.fill("#email", `profile-story-${runId}@example.test`);
    await page.fill("#password", "verify-test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 20000 });
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Проверка профиля Купчик");
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 20000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];

    console.log("2/5 people with avatars");
    const alexSlug = await createPerson(page, familySlug, "Александр", "Купчик", process.env.AVATAR_A);
    const eleSlug = await createPerson(page, familySlug, "Элеонора", "Купчик", process.env.AVATAR_B);

    console.log("3/5 seed relatives, event, story (SQL, this family only)");
    const storySlug = await seed(familySlug, alexSlug, eleSlug);

    console.log("4/5 profile");
    const profile = `${BASE_URL}/families/${familySlug}/people/${alexSlug}`;
    await page.goto(profile, { waitUntil: "networkidle" });
    await shoot(page, "profile-desktop");
    await shoot(page, "profile-desktop-full", true);
    await page.getByRole("tab", { name: /Истории/ }).click();
    await shoot(page, "profile-desktop-stories-tab", true);
    await page.getByRole("tab", { name: /Линия жизни/ }).click();
    await shoot(page, "profile-desktop-lifeline-tab", true);
    await page.getByRole("button", { name: /^\d{4}: Рождение/ }).locator("b").click();
    await page.getByRole("button", { name: "Изменить дату" }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(500);
    await shoot(page, "profile-desktop-lifeline-edit-birth");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^\d{4}: Ева/ }).locator("b").click();
    await shoot(page, "profile-desktop-lifeline-child", true);

    // Portraits are gallery photos: both uploaded portraits are already in
    // their owners' galleries; tag Элеонора's onto Александр too, then make
    // it his portrait from the gallery menu.
    const [pp] = await sql`select a.id alex, a.photo_media_id alex_media, e.photo_media_id ele_media
      from persons a join persons e on e.family_id=a.family_id
      join families f on f.id=a.family_id
      where f.slug=${familySlug} and a.slug=${alexSlug} and e.slug=${eleSlug}`;
    const [inGallery] = await sql`select count(*)::int n from media_person where media_id=${pp.alex_media} and person_id=${pp.alex}`;
    console.log(`  uploaded portrait in own gallery: ${inGallery.n === 1}`);
    await sql`insert into media_person (media_id, person_id) values (${pp.ele_media}, ${pp.alex})`;
    await page.goto(profile, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Фото/ }).click();
    const tiles = page.getByRole("button", { name: "Действия с фото", exact: true });
    for (const i of [0, 1]) {
      await tiles.nth(i).hover();
      await tiles.nth(i).click();
      await page.getByRole("menu").waitFor();
      await shoot(page, `profile-desktop-photo-menu-${i}`);
      if (await page.getByRole("menuitem", { name: "Сделать портретом" }).count()) break;
      await page.keyboard.press("Escape");
    }
    await page.getByRole("menuitem", { name: "Сделать портретом" }).click();
    await page.waitForTimeout(2500);
    const [after] = await sql`select photo_media_id from persons where id=${pp.alex}`;
    const [old] = await sql`select count(*)::int n from media where id=${pp.alex_media}`;
    console.log(`  portrait switched: ${after.photo_media_id === pp.ele_media}, old portrait kept: ${old.n === 1}`);
    await page.goto(profile, { waitUntil: "networkidle" });
    await shoot(page, "profile-desktop-new-portrait");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(profile, { waitUntil: "networkidle" });
    await shoot(page, "profile-phone-full", true);
    await page.getByRole("button", { name: "Содержание" }).click();
    await shoot(page, "profile-phone-contents");

    console.log("family home");
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.goto(`${BASE_URL}/families/${familySlug}`, { waitUntil: "networkidle" });
    await shoot(page, "family-home-desktop");
    await shoot(page, "family-home-desktop-full", true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/families/${familySlug}`, { waitUntil: "networkidle" });
    await shoot(page, "family-home-phone-full", true);

    console.log("5/5 story");
    const story = `${BASE_URL}/families/${familySlug}/stories/${storySlug}`;
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.goto(story, { waitUntil: "networkidle" });
    await shoot(page, "story-desktop");
    // After the portrait step both people share one photo, so the story may
    // have a single fallback slide (duplicates are dropped) — only shoot a
    // second slide when there is one.
    const second = page.getByRole("button", { name: /Элеонора/ });
    if (await second.count()) {
      await second.first().click();
      await page.waitForTimeout(1200);
      await shoot(page, "story-desktop-slide2");
      await page.getByRole("button", { name: "Все фото истории" }).click();
      await page.waitForTimeout(400);
      await shoot(page, "story-desktop-grid");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(story, { waitUntil: "networkidle" });
    await shoot(page, "story-phone-full", true);

    console.log(errors.length ? `page errors: ${errors.join(" | ")}` : "no page errors");
    console.log(`\nOK family=${familySlug}`);
  } catch (err) {
    console.error("\nFAILED:", err);
    await shoot(page, "error");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
