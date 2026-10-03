#!/usr/bin/env node
// Drives the dev server end-to-end to visually verify the family tree's
// card popover (person-node-popover-summary.tsx): register a throwaway
// account, add a birth place, a living person WITH a photo, maiden name,
// full birth date and birth place, and a deceased person with none of
// that, then click each card in the tree and screenshot its popover.
//
// Usage: node .claude/skills/run-photos/scripts/verify-tree-popover.mjs
// Requires: dev server already running at BASE_URL (default :3000).

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { deleteTestAccounts } from "./_test-accounts.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");
const runId = Date.now();

/** A 320x400 warm portrait-ish PNG: a soft light "head" on a dark ground,
 *  high enough up that the popover's face-favoring crop is checkable. */
function makePortraitPng() {
  const width = 320;
  const height = 400;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      const d = Math.hypot((x - 160) / 70, (y - 130) / 90);
      const t = Math.max(0, 1 - d);
      const px = row + 1 + x * 3;
      raw[px] = Math.round(70 + 170 * t);
      raw[px + 1] = Math.round(50 + 140 * t);
      raw[px + 2] = Math.round(40 + 110 * t);
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function screenshot(page, name) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  screenshot -> ${path.relative(process.cwd(), file)}`);
}

async function addPerson(page, familySlug, fields) {
  await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
    waitUntil: "networkidle",
  });
  if (fields.photo) {
    await page.locator('input[type="file"]').first().setInputFiles(fields.photo);
    await page.locator('img[alt=""]').first().waitFor({ timeout: 5000 });
  }
  await page.fill("#firstName", fields.firstName);
  await page.fill("#lastName", fields.lastName);
  if (fields.maidenName) await page.fill("#maidenName", fields.maidenName);
  if (fields.deceased) {
    await page.locator('[role="switch"][aria-labelledby="isLiving-label"]').click();
    await page.locator("#deathYear").waitFor({ timeout: 5000 });
  }
  if (fields.birthDay) await page.fill("#birthDay", fields.birthDay);
  if (fields.birthMonth) await page.fill("#birthMonth", fields.birthMonth);
  await page.fill("#birthYear", fields.birthYear);
  if (fields.deathYear) await page.fill("#deathYear", fields.deathYear);
  if (fields.birthPlace) {
    const input = page.getByLabel("Место рождения", { exact: true });
    await input.fill(fields.birthPlace.slice(0, 4));
    await page
      .getByRole("option", { name: new RegExp(fields.birthPlace) })
      .first()
      .click();
  }
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await page.waitForURL(/\/people\/(?!new$)[^/]+$/, { timeout: 20000 });
}

async function main() {
  const browser = await chromium.launch();
  const mobile = process.env.MOBILE === "1";
  const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    hasTouch: mobile,
  });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    console.log("1/5 Registering throwaway account…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Tree Popover Verifier");
    await page.fill("#email", `tree-popover-${runId}@example.test`);
    await page.fill("#password", "verify-test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });

    console.log("2/5 Creating a family and a birth place…");
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Проверка попапа");
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`${BASE_URL}/families/${familySlug}/places`, {
      waitUntil: "networkidle",
    });
    // Places live on the family map: «Добавить место» opens its edit panel.
    await page.getByRole("button", { name: "Добавить место" }).first().click();
    await page.fill("#place-name", "Пружаны");
    await page.locator('form button[type="submit"]').first().click();
    await page.getByText("Пружаны").first().waitFor({ timeout: 10000 });

    console.log("3/5 Adding a living person with everything filled in…");
    const photo = path.join(__dirname, "_test-photo-portrait.png");
    await writeFile(photo, makePortraitPng());
    await addPerson(page, familySlug, {
      photo,
      firstName: "Галина",
      lastName: "Ушкар",
      maidenName: "Тихонович",
      birthDay: "12",
      birthMonth: "3",
      birthYear: "1941",
      birthPlace: "Пружаны",
    });

    console.log("4/5 Adding a deceased person with no photo/place…");
    await addPerson(page, familySlug, {
      firstName: "Иван",
      lastName: "Ушкар",
      deceased: true,
      birthYear: "1936",
      deathYear: "2008",
    });

    console.log("5/5 Opening each card's popover in the tree…");
    await page.goto(`${BASE_URL}/families/${familySlug}/tree`, {
      waitUntil: "networkidle",
    });
    for (const [name, shot] of [
      ["Галина Ушкар", "tree-popover-01-with-photo"],
      ["Иван Ушкар", "tree-popover-02-no-photo"],
    ]) {
      await page.keyboard.press("Escape");
      await page
        .locator(".react-flow__node")
        .filter({ hasText: name })
        .first()
        .click();
      const popover = page.locator("[data-slot=popover-content]").first();
      await popover.waitFor({ timeout: 10000 });
      await page.waitForTimeout(600); // photo fade-in
      console.log(`    ${name}:`, JSON.stringify(await popover.innerText()));
      await screenshot(page, mobile ? `${shot}-mobile` : shot);
    }

    console.log("\nConsole/page errors:", errors.length ? errors : "none");
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "tree-popover-error-state");
    console.log("Console/page errors:", errors.length ? errors : "none");
    process.exitCode = 1;
  } finally {
    await browser.close();
    await deleteTestAccounts(runId);
  }
}

main();
