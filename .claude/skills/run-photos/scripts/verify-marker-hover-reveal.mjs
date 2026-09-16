#!/usr/bin/env node
// Verifies that outside tagging mode, placed tag markers are invisible by
// default and only reveal themselves when their chip (in the bottom
// TaggedPeopleStrip) is hovered/focused — the Instagram/Google Photos-style
// fix replacing permanently-visible dots on the photo.
//
// Usage: node .claude/skills/run-photos/scripts/verify-marker-hover-reveal.mjs

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");

const runId = Date.now();
const TEST_EMAIL = `marker-hover-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";
const TEST_NAME = "Marker Hover Verifier";
const FAMILY_NAME = "Проверка меток";

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
  const rowBytes = width * 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = 90;
      raw[px + 1] = 130;
      raw[px + 2] = 110;
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
    console.log("Registering throwaway account + family + person + photo…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", FAMILY_NAME);
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];

    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, {
      waitUntil: "networkidle",
    });
    await page.fill("#firstName", "Марк");
    await page.fill("#lastName", "Тестов");
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/families\/[^/]+\/people\/(?!new$)[^/]+$/, {
      timeout: 15000,
    });

    const imagePath = path.join(__dirname, "_test-photo-hover.png");
    await writeFile(imagePath, makeTestPng());
    await page.goto(`${BASE_URL}/families/${familySlug}/photos`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Добавить фото" }).click();
    await page.setInputFiles("#family-photo-upload-input", imagePath);
    await page.getByRole("button", { name: "Загрузить" }).click();
    await page.getByRole("button", { name: "Готово" }).waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForLoadState("networkidle");

    console.log("Opening lightbox and placing a tag…");
    await page.locator("img[alt]").first().waitFor({ timeout: 15000 });
    await page.locator("img[alt]").first().click();
    await page.getByRole("button", { name: "Отметить людей" }).click();

    const imageHandle = await page.evaluateHandle(() =>
      Array.from(document.querySelectorAll("img.object-contain")).find(
        (el) => {
          const overlay = el.parentElement?.querySelector(
            "div.absolute.inset-0",
          );
          return overlay && getComputedStyle(overlay).cursor === "none";
        },
      ),
    );
    const box = await imageHandle.asElement()?.boundingBox();
    if (!box) throw new Error("could not measure image box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await page.getByPlaceholder("Кто это?").waitFor({ timeout: 10000 });
    await page
      .getByPlaceholder("Кто это?")
      .pressSequentially("Марк", { delay: 60 });
    const option = page.getByRole("option", { name: "Марк Тестов" });
    await option.first().waitFor({ timeout: 10000 });
    await option.first().click();

    await page
      .locator('button[aria-label="Марк Тестов"]')
      .waitFor({ timeout: 10000 });

    console.log("Exiting tagging mode…");
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForTimeout(200);
    await screenshot(page, "marker-hidden-default");

    const markerOpacity = await page.evaluate(() => {
      const marker = document.querySelector('button[aria-label="Марк Тестов"] span[aria-hidden]');
      return marker ? getComputedStyle(marker).opacity : null;
    });
    console.log("  marker opacity outside tagging mode, no hover (should be 0):", markerOpacity);

    console.log("Hovering the chip…");
    const chip = page.getByRole("link", { name: "Марк Тестов" });
    await chip.waitFor({ timeout: 10000 });
    await chip.hover();
    await page.waitForTimeout(250);
    await screenshot(page, "marker-revealed-on-chip-hover");
    const markerOpacityHovered = await page.evaluate(() => {
      const marker = document.querySelector('button[aria-label="Марк Тестов"] span[aria-hidden]');
      return marker ? getComputedStyle(marker).opacity : null;
    });
    console.log("  marker opacity while chip hovered (should be 1):", markerOpacityHovered);

    console.log("Moving mouse away from chip…");
    await page.mouse.move(50, 50);
    await page.waitForTimeout(250);
    const markerOpacityAfter = await page.evaluate(() => {
      const marker = document.querySelector('button[aria-label="Марк Тестов"] span[aria-hidden]');
      return marker ? getComputedStyle(marker).opacity : null;
    });
    console.log("  marker opacity after mouse leaves chip (should be 0):", markerOpacityAfter);
    await screenshot(page, "marker-hidden-again");

    console.log("Hovering directly over the marker's own (invisible) hit area on the photo…");
    const markerBox = await page
      .locator('button[aria-label="Марк Тестов"]')
      .boundingBox();
    if (!markerBox) throw new Error("could not measure marker hit area");
    await page.mouse.move(
      markerBox.x + markerBox.width / 2,
      markerBox.y + markerBox.height / 2,
    );
    await page.waitForTimeout(250);
    const markerOpacityDirectHover = await page.evaluate(() => {
      const marker = document.querySelector('button[aria-label="Марк Тестов"] span[aria-hidden]');
      return marker ? getComputedStyle(marker).opacity : null;
    });
    console.log(
      "  marker opacity while hovering its own hit area directly (should be 0, NOT revealed this way):",
      markerOpacityDirectHover,
    );
    await screenshot(page, "marker-not-revealed-by-direct-hover");

    console.log("\nOK — see screenshots in", SCREENSHOT_DIR);
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "error-state-marker-hover");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
