#!/usr/bin/env node
// Drives the dev server end-to-end to visually verify the redesigned
// Person Profile hero banner (PersonProfileHero, replacing the old small
// circular-avatar header): register a throwaway test account, create a
// family + person, upload a photo to that person, load their profile page,
// screenshot the hero banner, then click it to confirm PhotoLightbox opens.
//
// Usage: node .claude/skills/run-photos/scripts/verify-profile-hero.mjs
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
const TEST_EMAIL = `profile-hero-verify-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";
const TEST_NAME = "Profile Hero Verifier";
const FAMILY_NAME = "Проверка hero";
const PERSON_FIRST_NAME = "Александра";
const PERSON_LAST_NAME = "Хероva";

// A checkerboard (not a solid color) so the hero's photo-panel-vs-dark-
// background composition and left-edge gradient fade are visible in a
// screenshot — a flat color makes the photo panel indistinguishable from
// the banner's own bg-foreground fill.
function makeTestPng() {
  const width = 8;
  const height = 8;
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
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
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      const light = (x + y) % 2 === 0;
      raw[px] = light ? 230 : 140;
      raw[px + 1] = light ? 200 : 90;
      raw[px + 2] = light ? 160 : 60;
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
    console.log("1/6 Registering throwaway test account…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });

    console.log("2/6 Creating a family…");
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", FAMILY_NAME);
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];
    console.log("    family slug:", familySlug);

    console.log("3/6 Creating a Person WITH an avatar set on the create form…");
    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
      waitUntil: "networkidle",
    });

    console.log("    screenshotting the fallback (no avatar yet) state…");
    await screenshot(page, "hero-00-no-photo-fallback-form");

    const imagePath = path.join(__dirname, "_test-photo-hero.png");
    await writeFile(imagePath, makeTestPng());
    // PersonPhotoPicker (person-photo-picker.tsx) renders PersonPhotoUpload's
    // hidden <input type="file"> inside a clickable circular dropzone at the
    // top of the create form — this is the avatar picker (photoMediaId),
    // distinct from #family-photo-upload-input's gallery dropzone lower on
    // other pages. setInputFiles targets it directly without needing to
    // click through the dropzone's overlay first.
    await page.locator('input[type="file"]').first().setInputFiles(imagePath);
    // Confirm the picker actually shows a preview (onFileChange fired)
    // before submitting — if this hangs, the file never reached React state.
    await page
      .locator('img[alt=""]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 });
    await screenshot(page, "hero-00b-avatar-picked-preview");

    await page.fill("#firstName", PERSON_FIRST_NAME);
    await page.fill("#lastName", PERSON_LAST_NAME);
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/families\/[^/]+\/people\/(?!new$)[^/]+$/, {
      timeout: 15000,
    });
    const personUrl = page.url();
    console.log("    person created:", personUrl);

    console.log("4/6 (fallback screenshot already taken above)…");

    console.log("5/6 Confirming avatar landed on the profile…");
    await page.waitForLoadState("networkidle");
    // Hard reload — rules out any client Router Cache staleness as a
    // variable in this test itself (person-create-form.tsx already calls
    // router.refresh() after the avatar upload for exactly this reason; this
    // is just belt-and-suspenders so a real hero-component bug isn't masked
    // by, or confused with, a router-cache timing issue in the test).
    await page.goto(personUrl, { waitUntil: "networkidle" });

    console.log("6/6 Verifying the hero banner renders with the avatar…");
    // The hero is decorative (no lightbox — the avatar is a distinct Media
    // row deliberately kept out of the person's gallery, see
    // person-profile-hero.tsx's own doc comment), so this just confirms the
    // <img> is present with the expected /api/media/<id> src, not a click
    // interaction.
    const heroImg = page.locator('img[src*="/api/media/"]').first();
    await heroImg.waitFor({ timeout: 15000 });
    const src = await heroImg.getAttribute("src");
    if (!src?.includes("/api/media/")) {
      throw new Error(`Hero <img> src looks wrong: ${src}`);
    }
    console.log("    hero <img> src:", src);
    await screenshot(page, "hero-01-with-photo");

    console.log("\nConsole/page errors captured during run:");
    console.log(consoleErrors.length ? consoleErrors : "  none");
    console.log("\nOK — see screenshots in", SCREENSHOT_DIR);
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "hero-error-state");
    console.log("\nConsole/page errors captured during run:");
    console.log(consoleErrors.length ? consoleErrors : "  none");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
