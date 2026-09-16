#!/usr/bin/env node
// Drives the dev server end-to-end to visually verify the photo tap-to-tag
// feature: register a throwaway test account, create a family + person,
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
const TEST_EMAIL = `photo-tag-verify-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";
const TEST_NAME = "Photo Tag Verifier";
const FAMILY_NAME = "Проверка тегов";
const PERSON_FIRST_NAME = "Тестовый";
const PERSON_LAST_NAME = "Человек";

/** A minimal valid 4x4 red PNG, built by hand (no image lib dependency) — just needs to pass the server's mime/size checks and render as *something*. */
function makeTestPng() {
  const width = 4;
  const height = 4;
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
      raw[px] = 200; // R
      raw[px + 1] = 90; // G
      raw[px + 2] = 60; // B
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
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    console.log("1/7 Registering throwaway test account…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });
    console.log("    logged in as", TEST_EMAIL);

    console.log("2/7 Creating a family…");
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", FAMILY_NAME);
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];
    console.log("    family slug:", familySlug);

    console.log("3/7 Creating a Person to tag…");
    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
      waitUntil: "networkidle",
    });
    await page.fill("#firstName", PERSON_FIRST_NAME);
    await page.fill("#lastName", PERSON_LAST_NAME);
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/families\/[^/]+\/people\/(?!new$)[^/]+$/, {
      timeout: 15000,
    });
    console.log("    person created:", page.url());

    console.log("4/7 Uploading a test photo…");
    const imagePath = path.join(__dirname, "_test-photo.png");
    await writeFile(imagePath, makeTestPng());
    await page.goto(`${BASE_URL}/families/${familySlug}/photos`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Добавить фото" }).click();
    await page.setInputFiles("#family-photo-upload-input", imagePath);
    await page.getByRole("button", { name: "Загрузить" }).click();
    // Wait for the upload to complete — panel switches its dismiss button to "Готово".
    await page
      .getByRole("button", { name: "Готово" })
      .waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForLoadState("networkidle");
    console.log("    photo uploaded");

    console.log("5/7 Opening the lightbox…");
    // The uploaded photo tile is a <button> wrapping the <img> inside the grid.
    await page.locator("img[alt]").first().waitFor({ timeout: 15000 });
    await page.locator("img[alt]").first().click();
    await page
      .getByRole("button", { name: "Отметить людей" })
      .waitFor({ timeout: 10000 });
    await screenshot(page, "01-lightbox-open");

    console.log("6/7 Enabling tagging mode and placing a tag…");
    await page.getByRole("button", { name: "Отметить людей" }).click();
    await screenshot(page, "02-tagging-mode-on");

    // Click roughly the center of the rendered photo to place a tag.
    const imageBox = await page
      .locator("img[alt]")
      .first()
      .boundingBox();
    if (!imageBox) throw new Error("Could not measure the lightbox image box");
    await page.mouse.click(
      imageBox.x + imageBox.width / 2,
      imageBox.y + imageBox.height / 2,
    );

    await page.getByPlaceholder("Кто это?").waitFor({ timeout: 10000 });
    await screenshot(page, "03-tag-person-popover");
    await page
      .getByPlaceholder("Кто это?")
      .pressSequentially(PERSON_FIRST_NAME, { delay: 60 });
    const personOption = page.getByRole("option", {
      name: `${PERSON_FIRST_NAME} ${PERSON_LAST_NAME}`,
    });
    await personOption.first().waitFor({ timeout: 10000 }); // search is a server round-trip
    await screenshot(page, "03b-tag-person-search-results");
    const optionBox = await personOption.first().boundingBox();
    if (!optionBox) throw new Error("Could not measure the person option box");
    await page.mouse.move(
      optionBox.x + optionBox.width / 2,
      optionBox.y + optionBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.up();

    console.log("7/7 Verifying the placed marker renders…");
    const markerLabel = `${PERSON_FIRST_NAME} ${PERSON_LAST_NAME}`;
    await page
      .locator(`button[aria-label="${markerLabel}"]`)
      .waitFor({ timeout: 10000 }); // revalidatePath round-trip
    await screenshot(page, "04-tag-placed");

    console.log("\nConsole/page errors captured during run:");
    console.log(consoleErrors.length ? consoleErrors : "  none");
    console.log("\nOK — see screenshots in", SCREENSHOT_DIR);
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "error-state");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
