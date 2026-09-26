#!/usr/bin/env node
// Drives the dev server end-to-end to verify the hand-set tag spotlight
// radius (tap → circle + person search → resize → pick → hover chip);
// based on verify-photo-tagging.mjs: register a throwaway test account, create a family + person,
// upload a test photo, open the lightbox, turn on tagging mode, place a
// tag on the photo, and screenshot the result.
//
// Usage: node .claude/skills/run-photos/scripts/verify-photo-tagging.mjs
// Requires: dev server already running and reachable at BASE_URL
// (default http://localhost:3000).

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");

const runId = Date.now();
const TEST_EMAIL = `tag-radius-verify-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";
const TEST_NAME = "Tag Radius Verifier";
const FAMILY_NAME = "Проверка тегов";
const PERSON_FIRST_NAME = "Тестовый";
const PERSON_LAST_NAME = "Человек";

/** A minimal valid 4x4 red PNG, built by hand (no image lib dependency) — just needs to pass the server's mime/size checks and render as *something*. */
function makeTestPng() {
  const width = 480;
  const height = 320;
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBuf, data]);
    const crc = zlib.crc32 ? zlib.crc32(body) : crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }
  function crc32(buf) {
    let c;
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (crc ^ buf[i]) & 0xff;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
      }
      crc = (crc >>> 8) ^ c;
    }
    return crc ^ 0xffffffff;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = 120 + Math.round((x / width) * 120); // R
      raw[px + 1] = 110 + Math.round((y / height) * 100); // G
      raw[px + 2] = 140; // B
    }
  }
  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function screenshot(page, name) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  screenshot -> ${path.relative(process.cwd(), file)}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const shot = (n) => screenshot(page, `radius-${n}`);

  try {
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 20000 });

    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", FAMILY_NAME);
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 20000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];

    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, { waitUntil: "networkidle" });
    await page.fill("#firstName", PERSON_FIRST_NAME);
    await page.fill("#lastName", PERSON_LAST_NAME);
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/families\/[^/]+\/people\/(?!new$)[^/]+$/, { timeout: 20000 });

    const imagePath = path.join(__dirname, "_test-photo-radius.png");
    await writeFile(imagePath, makeTestPng());
    await page.goto(`${BASE_URL}/families/${familySlug}/photos`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
    await page.setInputFiles("#family-photo-upload-input", imagePath);
    await page.getByRole("button", { name: "Загрузить" }).click();
    await page.getByRole("button", { name: "Готово" }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForLoadState("networkidle");

    await page.locator("img[alt]").first().waitFor({ timeout: 15000 });
    await page.locator("img[alt]").first().click();
    await page.getByRole("button", { name: "Отметить людей" }).click();

    const img = await page.locator('[role="dialog"] img[alt]').first().boundingBox();
    if (!img) throw new Error("no lightbox image box");
    await page.mouse.click(img.x + img.width * 0.4, img.y + img.height * 0.35);
    const handle = page.getByRole("slider");
    await handle.waitFor({ timeout: 10000 });
    await page.getByPlaceholder("Кто это?").waitFor({ timeout: 10000 });
    console.log("slider value on tap:", await handle.getAttribute("aria-valuenow"));
    await shot("01-tapped-circle-and-search");

    const hb = await handle.boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    const ring = page.locator('[role="dialog"] .rounded-full.border-dashed').first();
    const before = (await ring.boundingBox()).width;
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + 10, hb.y + hb.height / 2 + 10);
    const afterFirstMove = (await ring.boundingBox()).width;
    console.log("ring width before / after FIRST move:", before, afterFirstMove);
    await page.mouse.move(hb.x + hb.width / 2 + 60, hb.y + hb.height / 2 + 60, { steps: 8 });
    console.log("ring width mid-drag:", (await ring.boundingBox()).width);
    await page.mouse.up();
    console.log("slider value after drag:", await handle.getAttribute("aria-valuenow"));
    await shot("02-resized");

    await page.getByPlaceholder("Кто это?").pressSequentially(PERSON_FIRST_NAME, { delay: 60 });
    const option = page.getByRole("option", { name: `${PERSON_FIRST_NAME} ${PERSON_LAST_NAME}` });
    await option.first().waitFor({ timeout: 45000 });
    await option.first().click();
    await page.locator(`button[aria-label="${PERSON_FIRST_NAME} ${PERSON_LAST_NAME}"]`).waitFor({ timeout: 15000 });
    console.log("circle gone after pick:", (await page.getByRole("slider").count()) === 0);
    await shot("03-tag-placed");

    await page.getByRole("button", { name: "Готово" }).first().click();
    await page.waitForTimeout(800);
    const chip = page.getByText(`${PERSON_FIRST_NAME} ${PERSON_LAST_NAME}`).last();
    await chip.hover();
    await page.waitForTimeout(900);
    await shot("04-hover-spotlight");

    // Reload: the radius must come back from the DB, not just local state.
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("img[alt]").first().click();
    await page.getByText(`${PERSON_FIRST_NAME} ${PERSON_LAST_NAME}`).last().hover();
    await page.waitForTimeout(900);
    const vars = await page.locator(".photo-tag-spotlight").first().getAttribute("style");
    console.log("spotlight style after reload:", vars);
    await shot("05-hover-after-reload");

    console.log("errors:", consoleErrors.length ? consoleErrors : "none");
  } catch (err) {
    console.error("FAILED:", err);
    await shot("error-state");
    console.log("errors:", consoleErrors);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
