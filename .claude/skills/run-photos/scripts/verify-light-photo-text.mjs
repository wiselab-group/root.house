#!/usr/bin/env node
// Verifies the luminance-based text color fix: an avatar whose LEFT edge
// samples to a light gray (mimicking the real bug — Александр Купчик's own
// backfilled avatar sampled to #dfdfdf) must get dark (text-foreground)
// name/date text, not the light (text-background) text a "has a photo"-only
// check would wrongly pick.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");

const runId = Date.now();
const LEFT_COLOR = [0xdf, 0xdf, 0xdf]; // matches the real Александр Купчик bug exactly
const RIGHT_COLOR = [0x60, 0x60, 0x60];

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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    console.log("1/4 Registering throwaway test account…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Light Photo Verifier");
    await page.fill("#email", `light-photo-${runId}@example.test`);
    await page.fill("#password", "verify-test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });

    console.log("2/4 Creating a family…");
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Light Photo");
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];

    console.log("3/4 Creating a Person with a light-gray-left avatar…");
    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
      waitUntil: "networkidle",
    });
    const imagePath = path.join(__dirname, "_light-gray-avatar.png");
    await writeFile(imagePath, makeSplitColorPng());
    await page.locator('input[type="file"]').first().setInputFiles(imagePath);
    await page
      .locator('img[alt=""]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 });
    await page.fill("#firstName", "Светлый");
    await page.fill("#lastName", "Фон");
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/families\/[^/]+\/people\/(?!new$)[^/]+$/, {
      timeout: 15000,
    });
    const personUrl = page.url();
    await page.waitForLoadState("networkidle");
    await page.goto(personUrl, { waitUntil: "networkidle" });

    console.log("4/4 Checking the name's computed text color…");
    const heading = page.getByRole("heading", { name: "Светлый Фон" });
    await heading.waitFor({ timeout: 15000 });
    const textColor = await heading.evaluate((el) => getComputedStyle(el).color);
    console.log("    <h1> computed color:", textColor);

    // text-foreground should be a dark warm graphite tone, definitely NOT
    // near-white. The browser may report this as rgb(...) or a modern
    // lab()/oklch() function depending on how the token resolves — handle
    // both: rgb sums low, lab's L channel (first number, 0-100) is low.
    let isDark;
    const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [r, g, b] = rgbMatch.slice(1).map(Number);
      isDark = r + g + b < 400; // near-white would be ~700+
    } else {
      const labMatch = textColor.match(/lab\(([\d.]+)/);
      const lightness = labMatch ? Number(labMatch[1]) : null;
      isDark = lightness !== null && lightness < 50; // 0-100 scale, near-white would be ~95+
    }
    console.log("    is dark text:", isDark);
    if (!isDark) {
      throw new Error(
        `Expected dark text on a light-gray banner, got ${textColor} — the luminance check may not be working.`,
      );
    }
    console.log("    PASS — dark text correctly chosen for a light banner.");
    await screenshot(page, "light-photo-text-color-fix");

    console.log("\nOK");
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "light-photo-text-color-error");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
