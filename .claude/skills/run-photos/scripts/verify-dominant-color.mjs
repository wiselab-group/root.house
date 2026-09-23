#!/usr/bin/env node
// Verifies PersonProfileHero's dominant-color feature: upload an avatar
// whose LEFT portion is a distinct, known solid color (a deep blue, clearly
// not the app's brand terracotta/foreground tone), then confirm the hero
// banner's background/gradient actually uses something close to that color
// instead of the fixed --foreground fallback.
//
// Usage: node .claude/skills/run-photos/scripts/verify-dominant-color.mjs
// Requires: dev server already running and reachable at BASE_URL.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");

const runId = Date.now();
const TEST_EMAIL = `dominant-color-verify-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";

// Left half deep blue (#1a3d8f), right half a warm orange (#d97a3f) — the
// left-edge sampler should report something close to the blue, not the
// orange and not the app's terracotta/foreground tones.
const LEFT_COLOR = [0x1a, 0x3d, 0x8f];
const RIGHT_COLOR = [0xd9, 0x7a, 0x3f];

function makeSplitColorPng() {
  const width = 20;
  const height = 20;
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
      const color = x < width / 2 ? LEFT_COLOR : RIGHT_COLOR;
      raw[px] = color[0];
      raw[px + 1] = color[1];
      raw[px + 2] = color[2];
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

  try {
    console.log("1/4 Registering throwaway test account…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Dominant Color Verifier");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });

    console.log("2/4 Creating a family…");
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Dominant Color");
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];

    console.log("3/4 Creating a Person with a split-color avatar…");
    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
      waitUntil: "networkidle",
    });
    const imagePath = path.join(__dirname, "_split-color-avatar.png");
    await writeFile(imagePath, makeSplitColorPng());
    await page.locator('input[type="file"]').first().setInputFiles(imagePath);
    await page
      .locator('img[alt=""]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 });
    await page.fill("#firstName", "Синий");
    await page.fill("#lastName", "Слева");
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/families\/[^/]+\/people\/(?!new$)[^/]+$/, {
      timeout: 15000,
    });
    const personUrl = page.url();
    await page.waitForLoadState("networkidle");
    await page.goto(personUrl, { waitUntil: "networkidle" });

    console.log("4/4 Inspecting the hero banner's computed background color…");
    const heroBanner = page.locator('div[style*="background-color"]').first();
    await heroBanner.waitFor({ timeout: 15000 });
    const bgColor = await heroBanner.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    console.log("    hero banner computed backgroundColor:", bgColor);
    const expectedRgb = `rgb(${LEFT_COLOR[0]}, ${LEFT_COLOR[1]}, ${LEFT_COLOR[2]})`;
    console.log("    expected (left-edge color):", expectedRgb);
    if (bgColor !== expectedRgb) {
      throw new Error(
        `Hero background color mismatch — got ${bgColor}, expected ${expectedRgb}. Either dominantColor wasn't sampled/stored, or the fallback --foreground is being used instead.`,
      );
    }
    console.log("    MATCH — dominant color correctly sampled and applied.");
    await screenshot(page, "dominant-color-01-match");

    console.log("\nOK");
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "dominant-color-error-state");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
