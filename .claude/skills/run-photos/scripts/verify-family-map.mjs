#!/usr/bin/env node
// Family map (2026-10-03): full-bleed map, overview panel with root
// branches, branch/place/person/search panel states, and the timeline
// playing the family's moves. Builds the mocks' family (Купчик from
// Warsaw, Ушкар from Minsk, meeting in Kyiv) straight in SQL inside a
// throwaway account's family — removed again in `finally`.
//
// Usage: node .claude/skills/run-photos/scripts/verify-family-map.mjs

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
const OUT = path.join(__dirname, "..", "screenshots", "family-map");
const runId = Date.now();

function check(ok, label) {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
}

async function seed(familySlug, email) {
  const [{ id: familyId }] = await sql`select id from families where slug = ${familySlug}`;
  const [{ id: userId }] = await sql`select id from users where email = ${email}`;
  const place = async (name, country, lat, lng) =>
    (await sql`insert into places (family_id, name, country, latitude, longitude)
      values (${familyId}, ${name}, ${country}, ${lat}, ${lng}) returning id`)[0].id;
  const waw = await place("Варшава", "Польша", 52.2297, 21.0122);
  const lviv = await place("Львов", "Украина", 49.8397, 24.0297);
  const minsk = await place("Минск", "Беларусь", 53.9006, 27.559);
  const kyiv = await place("Киев", "Украина", 50.4501, 30.5234);
  const odesa = await place("Одесса", "Украина", 46.4825, 30.7233);
  await sql`insert into places (family_id, name) values (${familyId}, 'Хутор Ракитное')`;

  const person = async (slug, first, last, o = {}) =>
    (await sql`insert into persons (family_id, slug, first_name, last_name, maiden_name, gender,
        is_living, birth_date_year, birth_date_precision, death_date_year, death_date_precision,
        birth_place_id, death_place_id, residence_place_id, created_by)
      values (${familyId}, ${slug}, ${first}, ${last}, ${o.maiden ?? null}, ${o.gender ?? "unknown"},
        ${o.living ?? false}, ${o.born ?? null}, ${o.born ? "year_only" : null},
        ${o.died ?? null}, ${o.died ? "year_only" : null},
        ${o.bp ?? null}, ${o.dp ?? null}, ${o.rp ?? null}, ${userId}) returning id`)[0].id;
  const ivan = await person("ivan", "Иван", "Купчик", { gender: "male", born: 1898, died: 1980, bp: waw, dp: lviv });
  const anna = await person("anna", "Анна", "Купчик", { gender: "female", maiden: "Иванова" });
  const galina = await person("galina", "Галина", "Купчик", { gender: "female", born: 1945, died: 2026, bp: lviv, dp: kyiv });
  const petr = await person("petr", "Пётр", "Ушкар", { gender: "male", born: 1930, bp: minsk });
  const sergey = await person("sergey", "Сергей", "Ушкар", { gender: "male", living: true, born: 1960, bp: minsk });
  const lyudmila = await person("lyudmila", "Людмила", "Ушкар", { gender: "female", maiden: "Купчик", living: true, born: 1962, bp: lviv });
  const olga = await person("olga", "Ольга", "Купчик", { gender: "female", living: true, born: 1968, bp: kyiv, rp: odesa });
  const alex = await person("alex", "Александр", "Ушкар", { gender: "male", living: true, born: 1988, bp: kyiv });
  await person("maria", "Мария", "Ушкар", { gender: "female", living: true, born: 2014, bp: kyiv });

  for (const [p, c] of [[ivan, galina], [anna, galina], [petr, sergey], [galina, lyudmila], [galina, olga], [sergey, alex], [lyudmila, alex]]) {
    await sql`insert into relationships_parent_child (family_id, parent_id, child_id) values (${familyId}, ${p}, ${c})`;
  }
  const [{ id: maria }] = await sql`select id from persons where family_id = ${familyId} and slug = 'maria'`;
  await sql`insert into relationships_parent_child (family_id, parent_id, child_id) values (${familyId}, ${alex}, ${maria})`;
  for (const [a, b] of [[ivan, anna], [sergey, lyudmila]]) {
    await sql`insert into relationships_partnership (family_id, person1_id, person2_id, status) values (${familyId}, ${a}, ${b}, 'married')`;
  }
  const event = async (type, title, year, placeId, people) => {
    const [{ id }] = await sql`insert into events (family_id, type, title, date_year, date_precision, place_id)
      values (${familyId}, ${type}, ${title}, ${year}, 'year_only', ${placeId}) returning id`;
    for (const p of people) await sql`insert into event_participants (event_id, person_id) values (${id}, ${p})`;
  };
  await event("migration", "", 1939, lviv, [ivan]);
  await event("migration", "", 1967, kyiv, [galina, lyudmila]);
  await event("migration", "", 1985, kyiv, [sergey]);
  await event("marriage", "", 1985, kyiv, [sergey, lyudmila]);
  await event("other", "Семейная встреча", 2018, kyiv, []);
}

async function register(page) {
  const email = `family-map-${runId}@example.test`;
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#name", "Family Map Verifier");
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
  await page.getByRole("button", { name: /^Киев/ }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const { email, familySlug } = await register(page);
    await seed(familySlug, email);
    const mapUrl = `${BASE_URL}/families/${familySlug}/map`;

    console.log("desktop");
    await openMap(page, mapUrl);
    check(page.workers().length > 0, "maplibre tile worker started");
    check(await page.getByText("Откуда мы · 2 ветви").isVisible(), "overview lists 2 root branches");
    check(await page.getByText("Где семья сейчас").isVisible(), "overview shows where the family is now");
    const searchBox = await page.getByRole("button", { name: /Найти человека или место/ }).boundingBox();
    check(searchBox.height >= 44, `the search field keeps its height in a full panel (${searchBox.height}px)`);
    await shoot(page, "01-overview");

    const kupchik = page.getByRole("button", { name: /^Купчик/ });
    check(
      await kupchik.getByText("дальше — ветвь Ушкар").isVisible(),
      "a line that flows into another branch says so, not repeats it",
    );
    await kupchik.hover();
    await page.waitForTimeout(600);
    await shoot(page, "02-branch-hover");
    await kupchik.click();
    await page.waitForTimeout(1600);
    check(await page.getByRole("heading", { name: "Купчик" }).isVisible(), "branch panel opens");
    check(page.url().includes("branch="), "branch is in the URL");
    check(
      await page.getByRole("button", { name: "Дальше — ветвь Ушкар" }).isVisible(),
      "branch panel leads on to the branch it flowed into",
    );
    await shoot(page, "03-branch");

    await page.getByRole("button", { name: /Галина Купчик/ }).first().click();
    await page.waitForTimeout(1600);
    await shoot(page, "04-person");

    await page.getByRole("button", { name: "Обзор" }).click();
    await page.getByRole("button", { name: /^Киев/ }).first().click();
    await page.waitForTimeout(1600);
    check(await page.getByText("Поженились").isVisible(), "place panel groups by meaning");
    await shoot(page, "05-place");

    await page.getByRole("button", { name: "Обзор" }).click();
    await page.getByRole("button", { name: "Найти человека или место" }).click();
    await page.waitForTimeout(400);
    check(await page.getByText("Не на карте · 1").isVisible(), "search lists the place without a point");
    await shoot(page, "06-search");

    // Phase 4 — places managed on the map itself.
    await page.getByRole("button", { name: /Хутор Ракитное/ }).click();
    await page.getByText("Нажмите на карту, чтобы поставить точку").waitFor();
    check(true, "a place without a point opens its edit on the map");
    await page.mouse.click(1000, 450);
    await page.waitForTimeout(400);
    check(await page.getByText(/^Точка: /).isVisible(), "a click on the map sets the point");
    await shoot(page, "06b-set-point");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("heading", { name: "Хутор Ракитное" }).waitFor({ timeout: 20000 });
    check(
      await page.getByRole("button", { name: /^Хутор Ракитное/ }).first().isVisible(),
      "saved: the place's sheet opens and its pin is on the map",
    );
    await shoot(page, "06c-point-saved");

    await page.getByRole("button", { name: "Обзор" }).click();
    await page.getByRole("button", { name: "Найти человека или место" }).click();
    await page.getByRole("button", { name: "Добавить место" }).click();
    await page.mouse.click(1100, 300);
    await page.fill("#place-name", "Проверочное место");
    await page.getByRole("button", { name: "Добавить место" }).click();
    await page.getByRole("heading", { name: "Проверочное место" }).waitFor({ timeout: 20000 });
    check(true, "a new place added by a click on the map opens its sheet");
    await page.getByRole("button", { name: "Изменить место" }).click();
    await page.getByRole("button", { name: "Удалить" }).click();
    await page.getByRole("button", { name: "Удалить" }).last().click();
    await page.getByText("Откуда мы · 2 ветви").waitFor({ timeout: 20000 });
    const gone = await page
      .getByRole("button", { name: /^Проверочное место/ })
      .waitFor({ state: "detached", timeout: 10000 })
      .then(() => true, () => false);
    check(gone, "deleting the place removes its pin");

    await page.goto(`${BASE_URL}/families/${familySlug}/places`, { waitUntil: "networkidle" });
    check(page.url().includes("/map?panel=places"), "/places redirects to the map's place list");
    await openMap(page, mapUrl);
    await page.getByRole("button", { name: "Найти человека или место" }).click();
    await page.getByRole("button", { name: "Отмена" }).click();

    await page.getByRole("button", { name: /Как семья сюда пришла/ }).click();
    await page.waitForTimeout(9000);
    await shoot(page, "07-playing");
    await page.getByRole("button", { name: "Пауза" }).click();
    await page.getByLabel("Год на карте").fill("1967");
    await page.waitForTimeout(1200);
    check(await page.getByText("Род к 1967 году").isVisible(), "feed follows the slider");
    await shoot(page, "08-year-1967");

    await page.getByRole("button", { name: "Всё время" }).click();
    await page.getByRole("button", { name: "Вид карты" }).click();
    await page.waitForTimeout(600);
    await shoot(page, "09-theme-menu");
    await page.getByRole("button", { name: /Пергамент/ }).click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(2500);
    await shoot(page, "09b-parchment");
    await openMap(page, mapUrl);
    await page.getByRole("button", { name: "Вид карты" }).click();
    check(
      (await page.getByRole("button", { name: /Пергамент/ }).getAttribute("aria-pressed")) === "true",
      "the chosen map style survives a reload",
    );
    await page.keyboard.press("Escape");
    const session = await context.storageState();
    await context.close();

    console.log("phone");
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      storageState: session,
    });
    const p2 = await phone.newPage();
    p2.on("pageerror", (e) => errors.push(e.message));
    await openMap(p2, mapUrl);
    // A fresh browser context shares no localStorage — the look comes from
    // the profile (users.map_theme), as it would on another device.
    await p2.getByRole("button", { name: "Вид карты" }).tap();
    check(
      (await p2.getByRole("button", { name: /Пергамент/ }).getAttribute("aria-pressed")) === "true",
      "the map style follows the user to another device",
    );
    await shoot(p2, "10-phone-parchment");
    await p2.getByRole("button", { name: /Архив/ }).tap();
    await p2.keyboard.press("Escape");
    await p2.waitForTimeout(2000);
    await shoot(p2, "11-phone-overview");
    // The overview rests as a thin strip; a tap on it opens the sheet.
    const strip = await p2.getByRole("heading", { name: "Карта рода" }).boundingBox();
    check(strip.y > 844 - 140, `the overview rests as a thin strip (title at ${Math.round(strip.y)})`);
    await p2.getByRole("heading", { name: "Карта рода" }).tap();
    await p2.waitForTimeout(900);
    check(
      (await p2.getByRole("button", { name: "Свернуть панель" }).getAttribute("aria-expanded")) === "true",
      "a tap on the strip opens the sheet",
    );
    await p2.getByRole("button", { name: "Свернуть панель" }).tap();
    await p2.waitForTimeout(900);
    // A swipe through the peeking sheet opens it, and its last row can be
    // scrolled into view (the peek used to hide the bottom off-screen).
    await p2.evaluate(() => {
      const list = document.querySelector("[data-panel-scroll]");
      const touch = new Touch({ identifier: 1, target: list, clientX: 200, clientY: 700 });
      list.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch] }));
    });
    await p2.waitForTimeout(900);
    const lastRow = await p2.evaluate(() => {
      const list = document.querySelector("[data-panel-scroll]");
      list.scrollTop = list.scrollHeight;
      const last = list.lastElementChild.getBoundingClientRect();
      return { bottom: last.bottom, viewport: window.innerHeight };
    });
    await p2.waitForTimeout(300);
    check(lastRow.bottom <= lastRow.viewport, `the sheet's last row scrolls into view (${Math.round(lastRow.bottom)} ≤ ${lastRow.viewport})`);
    await shoot(p2, "11b-phone-sheet-open");
    await p2.getByRole("button", { name: "Свернуть панель" }).tap();
    await p2.waitForTimeout(900);
    await p2.getByRole("button", { name: /^Киев/ }).first().tap();
    await p2.waitForTimeout(1600);
    await shoot(p2, "12-phone-place");
    await p2.getByRole("button", { name: "Обзор" }).tap();
    await p2.waitForTimeout(600);
    await p2.getByRole("button", { name: /Как семья сюда пришла/ }).first().tap();
    await p2.waitForTimeout(7000);
    const sheet = await p2.locator("aside").first().evaluate((el) => ({
      cls: el.className.split(" ").filter((c) => c.includes("translate")).join(" "),
      translate: getComputedStyle(el).translate,
      top: el.getBoundingClientRect().top,
    }));
    console.log("  sheet while playing:", sheet);
    check(sheet.top >= 840, "the sheet steps aside while the story plays");
    const lviv = await p2.getByRole("button", { name: /^Львов/ }).first().boundingBox();
    console.log("  Lviv pin box:", lviv);
    check(Boolean(lviv && lviv.x > 0 && lviv.x < 390 && lviv.y > 56 && lviv.y < 844), "the family stays in view while playing");
    await shoot(p2, "13-phone-playing");
    await phone.close();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (errors.length) console.log("page errors:", errors);
    await browser.close();
    await deleteTestAccounts(runId);
  }
}

main();
