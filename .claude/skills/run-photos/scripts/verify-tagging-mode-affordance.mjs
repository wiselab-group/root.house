#!/usr/bin/env node
// Verifies the tagging-mode visual affordances added on top of the base
// tap-to-tag feature: a primary-ring frame around the photo area, a banner
// pill above the photo, and a custom pointer-follow marker (system cursor
// hidden) while hovering the photo in tagging mode — all reverting when
// tagging mode is toggled off.
//
// Usage: node .claude/skills/run-photos/scripts/verify-tagging-mode-affordance.mjs

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");

const runId = Date.now();
const TEST_EMAIL = `tagging-affordance-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";
const TEST_NAME = "Affordance Verifier";
const FAMILY_NAME = "Проверка режима";

function makeTestPng() {
  const width = 4;
  const height = 4;
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
      raw[px] = 200;
      raw[px + 1] = 90;
      raw[px + 2] = 60;
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
    console.log("Registering throwaway account + family + photo…");
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

    const imagePath = path.join(__dirname, "_test-photo-affordance.png");
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

    console.log("Opening lightbox…");
    await page.locator("img[alt]").first().waitFor({ timeout: 15000 });
    await page.locator("img[alt]").first().click();
    const toggle = page.getByRole("button", { name: "Отметить людей" });
    await toggle.waitFor({ timeout: 10000 });

    console.log("Checking OFF state…");
    await screenshot(page, "off-state");
    const bannerOff = await page.getByText("Нажмите на человека").count();
    console.log("  banner present (should be 0):", bannerOff);

    console.log("Toggling tagging mode ON…");
    await toggle.click();
    await page.getByRole("button", { name: "Готово" }).waitFor({ timeout: 5000 });
    console.log("  button now reads 'Готово'");

    await page.waitForTimeout(500); // let onLoad/measurement settle
    const frameDebug = await page.evaluate(() => {
      const img = document.querySelector("img.object-contain");
      const container = img?.parentElement;
      const ringDiv = container?.querySelector('[aria-hidden].ring-primary');
      return {
        imgComplete: img?.complete,
        naturalWidth: img?.naturalWidth,
        naturalHeight: img?.naturalHeight,
        containerRect: container?.getBoundingClientRect(),
        ringDivFound: !!ringDiv,
        ringDivStyle: ringDiv
          ? {
              left: ringDiv.style.left,
              top: ringDiv.style.top,
              width: ringDiv.style.width,
              height: ringDiv.style.height,
              className: ringDiv.className,
            }
          : null,
      };
    });
    console.log("  frame debug:", JSON.stringify(frameDebug, null, 2));

    const imageBox = await page.locator("img.object-contain").first().boundingBox();
    if (!imageBox) throw new Error("could not measure image box");

    // Move mouse over the photo and inspect cursor + marker element.
    await page.mouse.move(
      imageBox.x + imageBox.width / 2,
      imageBox.y + imageBox.height / 2,
    );
    await page.waitForTimeout(150);
    const cursorAndMarker = await page.evaluate(() => {
      const img = document.querySelector("img.object-contain");
      // PhotoTagLayer renders as the sibling after the frame ring div.
      const overlay = img?.parentElement?.querySelector(
        "div.absolute.inset-0",
      );
      const cursorStyle = overlay ? getComputedStyle(overlay).cursor : null;
      const marker = overlay?.querySelector('[aria-hidden]');
      return {
        overlayFound: !!overlay,
        cursorStyle,
        markerHidden: marker ? marker.hasAttribute("hidden") : null,
        markerLeft: marker ? marker.style.left : null,
        markerTop: marker ? marker.style.top : null,
      };
    });
    console.log("  cursor + marker state:", cursorAndMarker);
    await screenshot(page, "on-state-hovering");

    console.log("Toggling tagging mode OFF…");
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForTimeout(150);
    const buttonBackToDefault = await page
      .getByRole("button", { name: "Отметить людей" })
      .count();
    console.log("  button back to 'Отметить людей' (should be 1):", buttonBackToDefault);
    const frameGoneAfterOff = await page.evaluate(() => {
      const img = document.querySelector("img.object-contain");
      return !img?.parentElement?.querySelector('[aria-hidden].ring-primary');
    });
    console.log("  frame gone after off (should be true):", frameGoneAfterOff);
    await screenshot(page, "off-state-after-toggle");

    console.log("\nOK — see screenshots in", SCREENSHOT_DIR);
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "error-state-affordance");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
