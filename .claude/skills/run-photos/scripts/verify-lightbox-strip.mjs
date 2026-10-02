#!/usr/bin/env node
// Visually verifies the redesigned lightbox (variant C2, 2026-09-29): top
// bar with «N / M» + caption, one fixed-height bottom strip that shows the
// tagged people (desktop: fit-to-width names + «+N» list with search;
// phone: finger-scrolled names with fades, a count chip and a one-time
// nudge) or, on desktop, the filmstrip.
//
// Setup: throwaway account + family through the real UI, three generated
// sepia "archive" photos uploaded through the real upload dialog, then —
// scoped to this run's own new family — 20 people inserted with SQL and
// tagged on the group photo at their faces, 2 on a portrait, none on the
// third photo.
//
// Usage: node .claude/skills/run-photos/scripts/verify-lightbox-strip.mjs
// Requires: dev server at BASE_URL (default http://localhost:3000) and
// DATABASE_URL in .env.local.

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteTestAccounts } from "./_test-accounts.mjs";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "lightbox-strip");
const runId = Date.now();
const EMAIL = `lightbox-strip-${runId}@example.test`;

const NAMES = [
  ["Анна", "Соколова"], ["Пётр", "Соколов"], ["Мария", "Соколова"], ["Григорий", "Соколов"],
  ["Лидия", "Орлова"], ["Вера", "Соколова"], ["Николай", "Соколов"], ["Тамара", "Орлова"],
  ["Ольга", "Беляева"], ["Сергей", "Беляев"], ["Зинаида", "Крылова"], ["Михаил", "Крылов"],
  ["Галина", "Панова"], ["Юрий", "Панов"], ["Людмила", "Орлова"], ["Борис", "Соколов"],
  ["Нина", "Лебедева"], ["Валентин", "Лебедев"], ["Раиса", "Громова"], ["Аркадий", "Громов"],
];

// Three rows of faces (x, y, size as fractions of the photo) — 7 + 7 + 6.
const CROWD = [
  ...[0.1, 0.23, 0.36, 0.49, 0.62, 0.75, 0.9].map((x, i) => [x, 0.22, 0.052, (i * 0.37) % 1]),
  ...[0.12, 0.26, 0.39, 0.52, 0.65, 0.79, 0.92].map((x, i) => [x, 0.42, 0.056, (i * 0.53 + 0.2) % 1]),
  ...[0.14, 0.3, 0.46, 0.62, 0.78, 0.92].map((x, i) => [x, 0.64, 0.06, (i * 0.29 + 0.4) % 1]),
];
const PHOTOS = [
  { file: "_lb-crowd.jpg", w: 1600, h: 1000, figs: CROWD,
    title: "Встреча выпускников школы №12 через десять лет после выпуска. Рязань, май 1975" },
  { file: "_lb-wedding.jpg", w: 960, h: 1200, figs: [[0.36, 0.34, 0.09, 0.7], [0.64, 0.36, 0.085, 0.1]],
    title: "Свадьба Петра и Марии, 1952" },
  { file: "_lb-porch.jpg", w: 1100, h: 1100, figs: [[0.5, 0.36, 0.13, 0.3]], title: null },
];

/** Draws a soft sepia group portrait in the browser; returns a JPEG data URL. */
function paintInPage({ w, h, figs }) {
  const lo = document.createElement("canvas");
  lo.width = w / 2; lo.height = h / 2;
  const c = lo.getContext("2d");
  c.scale(0.5, 0.5);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#b9a38a"); g.addColorStop(0.62, "#8a7560"); g.addColorStop(0.63, "#6c5a48"); g.addColorStop(1, "#3d3127");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (const [fx, fy, fs, tone] of figs) {
    const x = fx * w, y = fy * h, s = fs * h, sh = s * 1.25;
    c.fillStyle = `rgb(${70 + tone * 150 | 0},${60 + tone * 132 | 0},${50 + tone * 110 | 0})`;
    c.beginPath(); c.moveTo(x - sh * 1.05, h); c.lineTo(x - sh * 1.02, y + s * 1.55);
    c.quadraticCurveTo(x - sh * 0.95, y + s * 0.95, x - s * 0.3, y + s * 0.82); c.lineTo(x + s * 0.3, y + s * 0.82);
    c.quadraticCurveTo(x + sh * 0.95, y + s * 0.95, x + sh * 1.02, y + s * 1.55); c.lineTo(x + sh * 1.05, h); c.closePath(); c.fill();
    c.fillStyle = "#b8967a"; c.fillRect(x - s * 0.16, y + s * 0.35, s * 0.32, s * 0.5);
    const fg = c.createRadialGradient(x - s * 0.12, y - s * 0.1, s * 0.05, x, y, s * 0.62);
    fg.addColorStop(0, "#ecd8bf"); fg.addColorStop(1, "#a88b6f");
    c.fillStyle = fg; c.beginPath(); c.ellipse(x, y, s * 0.42, s * 0.52, 0, 0, 7); c.fill();
    c.fillStyle = `rgb(${60 + tone * 70 | 0},${46 + tone * 52 | 0},${36 + tone * 38 | 0})`;
    c.beginPath(); c.ellipse(x, y - s * 0.3, s * 0.44, s * 0.26, 0, Math.PI, 0); c.fill();
  }
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const d = cv.getContext("2d");
  d.filter = "blur(1.4px) sepia(0.6)"; d.drawImage(lo, 0, 0, w, h);
  return cv.toDataURL("image/jpeg", 0.85);
}

async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desk.newPage();
  const errors = [];
  // The Next dev-tools badge sits bottom-left — right over the strip's tabs.
  const hideDevOverlay = (ctx) =>
    ctx.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal{display:none!important}";
      document.addEventListener("DOMContentLoaded", () => document.head.append(style));
    });
  await hideDevOverlay(desk);
  const track = (p) => {
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  };
  track(page);

  try {
    console.log("1/5 Generating photos…");
    for (const photo of PHOTOS) {
      const url = await page.evaluate(paintInPage, photo);
      await writeFile(path.join(tmpdir(), photo.file), Buffer.from(url.split(",")[1], "base64"));
    }

    console.log("2/5 Account, family, upload…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Lightbox Strip");
    await page.fill("#email", EMAIL);
    await page.fill("#password", "test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", `Соколовы ${runId}`);
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const slug = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`${BASE_URL}/families/${slug}/photos`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
    await page.setInputFiles(
      "#family-photo-upload-input",
      PHOTOS.map((p) => path.join(tmpdir(), p.file)),
    );
    await page.getByRole("button", { name: "Загрузить" }).click();
    await page.getByRole("button", { name: "Готово" }).waitFor({ timeout: 60000 });
    await page.getByRole("button", { name: "Готово" }).click();

    console.log("3/5 Seeding people and tags with SQL…");
    const [fam] = await sql`select id from families where slug=${slug}`;
    const [user] = await sql`select id from users where email=${EMAIL}`;
    let media = [];
    for (let i = 0; i < 20 && media.length < PHOTOS.length; i++) {
      media = await sql`select id, size_bytes from media where family_id=${fam.id}`;
      if (media.length < PHOTOS.length) await page.waitForTimeout(500);
    }
    // width/height are filled in asynchronously — match the originals by size.
    const sizes = new Map();
    for (const p of PHOTOS) sizes.set(p, (await stat(path.join(tmpdir(), p.file))).size);
    const byShape = (w, h) => {
      const p = PHOTOS.find((x) => x.w === w && x.h === h);
      return media.find((m) => Number(m.size_bytes) === sizes.get(p));
    };
    const ids = [];
    for (const [i, [first, last]] of NAMES.entries()) {
      const [row] = await sql`insert into persons (family_id, slug, first_name, last_name, created_by)
        values (${fam.id}, ${`p-${i}-${runId}`}, ${first}, ${last}, ${user.id}) returning id`;
      ids.push(row.id);
    }
    for (const [pi, photo] of PHOTOS.entries()) {
      const m = byShape(photo.w, photo.h);
      if (!m) throw new Error(`uploaded media ${photo.file} not found (dimensions)`);
      await sql`update media set title=${photo.title} where id=${m.id}`;
      if (pi === 2) continue;
      const people = pi === 0 ? ids : [ids[1], ids[2]];
      for (const [k, personId] of people.entries()) {
        const [fx, fy] = photo.figs[k];
        await sql`insert into media_person (media_id, person_id, x_percent, y_percent)
          values (${m.id}, ${personId}, ${(fx * 100).toFixed(2)}, ${(fy * 100).toFixed(2)})`;
      }
    }

    console.log("4/5 Desktop 1280×800…");
    await page.goto(`${BASE_URL}/families/${slug}/photos`, { waitUntil: "networkidle" });
    await page.locator(`img[alt^="Встреча выпускников"]`).first().click();
    await page.getByRole("tablist").waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    await shoot(page, "d01-open-group-photo");
    await page.getByRole("link", { name: /Соколова/ }).first().hover();
    await page.waitForTimeout(600);
    await shoot(page, "d02-hover-spotlight");
    await page.getByRole("button", { name: /показать всех/ }).click();
    await page.getByPlaceholder("Найти по имени").fill("ов");
    await page.waitForTimeout(400);
    await shoot(page, "d03-more-list-search");
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: /Все фото/ }).click();
    await page.waitForTimeout(600);
    await shoot(page, "d04-filmstrip");
    // Regression (2026-09-29): scrollIntoView on a thumbnail scrolled the
    // lightbox itself sideways (52px at 1280 after jumping to an edge
    // thumbnail — reproduced with the old code). Check after EVERY jump: a
    // jump back to the center thumbnail scrolls it back to 0.
    for (const n of [3, 1, 2]) {
      await page.getByRole("button", { name: `Фото ${n} из 3` }).click();
      await page.waitForTimeout(500);
      const shifted = await page.evaluate(() =>
        [document.querySelector('[role="dialog"]'), document.scrollingElement]
          .concat([...document.querySelectorAll('[role="dialog"] *')])
          .filter((el) => el && el.scrollLeft > 0 && !el.matches(".touch-pan-x, .overflow-x-auto"))
          .map((el) => `${el.tagName} scrollLeft=${el.scrollLeft}`),
      );
      if (shifted.length) throw new Error(`lightbox scrolled sideways after photo ${n}: ${shifted}`);
    }
    console.log("    no sideways scroll after filmstrip jumps");
    // Regression (2026-09-29): a clicked thumbnail kept focus, so ← left its
    // focus ring on the old thumbnail. Focus must follow the current photo.
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(700);
    const focus = await page.evaluate(() => ({
      label: document.activeElement?.getAttribute("aria-label"),
      current: document.activeElement?.getAttribute("aria-current"),
    }));
    if (focus.current !== "true")
      throw new Error(`focus stayed on a non-current thumbnail: ${focus.label}`);
    console.log(`    focus follows the photo (${focus.label})`);
    await shoot(page, "d04b-focus-follows");
    await page.getByRole("button", { name: "Отметить людей" }).click();
    await page.waitForTimeout(500);
    await shoot(page, "d05-tagging-pins-people");
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForTimeout(400);
    await shoot(page, "d06-done-restores-filmstrip");
    await page.getByRole("button", { name: /Фото 3 из 3/ }).click();
    await page.getByRole("tab", { name: /Кто на фото/ }).click();
    await page.waitForTimeout(600);
    await shoot(page, "d07-empty-people");

    console.log("5/5 Phone 390×844…");
    const phone = await browser.newContext({
      storageState: await desk.storageState(),
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await hideDevOverlay(phone);
    const mp = await phone.newPage();
    track(mp);
    await mp.goto(`${BASE_URL}/families/${slug}/photos`, { waitUntil: "networkidle" });
    await mp.locator(`img[alt^="Встреча выпускников"]`).first().tap();
    await mp.getByRole("button", { name: /Все отмеченные/ }).waitFor({ timeout: 10000 });
    await mp.waitForTimeout(1200);
    await shoot(mp, "m01-open-mid-nudge");
    await mp.waitForTimeout(1200);
    await shoot(mp, "m02-at-rest-fade");
    await mp.locator(".touch-pan-x").evaluate((el) => (el.scrollLeft = 300));
    await mp.waitForTimeout(300);
    await shoot(mp, "m03-scrolled-both-fades");
    // A name visible without scrolling (the 4th from the left).
    await mp.locator(".touch-pan-x button", { hasText: "Пётр Соколов" }).tap();
    await mp.waitForTimeout(500);
    await shoot(mp, "m04-tap-spotlight");
    await mp.getByRole("button", { name: /Все отмеченные/ }).tap();
    await mp.waitForTimeout(500);
    await shoot(mp, "m05-full-list");

    console.log("\nErrors:", errors.length ? errors : "none");
  } catch (err) {
    console.error("\nFAILED:", err);
    await shoot(page, "error-state").catch(() => {});
    console.log("Errors:", errors);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await deleteTestAccounts(runId);
  }
}

main();
