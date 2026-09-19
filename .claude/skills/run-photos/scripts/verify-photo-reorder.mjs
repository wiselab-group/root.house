#!/usr/bin/env node
// Drives the dev server end-to-end to visually verify the new drag-and-drop
// gallery reorder feature: register a throwaway test account, create a
// family + person, upload 3 distinctly-colored test photos to the family
// gallery, drag the first tile to the last position, verify the order
// changes immediately (optimistic local state), reload the page and verify
// the order persisted (confirms reorderMediaAction wrote sortOrder to the
// DB), and verify a plain click still opens PhotoLightbox (drag didn't
// break click-to-open).
//
// Usage: node .claude/skills/run-photos/scripts/verify-photo-reorder.mjs
// Requires: dev server already running and reachable at BASE_URL
// (default http://localhost:3000).

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots", "reorder");

const runId = Date.now();
const TEST_EMAIL = `photo-reorder-verify-${runId}@example.test`;
const TEST_PASSWORD = "verify-test-password-123";
const TEST_NAME = "Photo Reorder Verifier";
const FAMILY_NAME = "Проверка порядка фото";
const PERSON_FIRST_NAME = "Тестовый";
const PERSON_LAST_NAME = "Человек";

/** A minimal valid solid-color 8x8 PNG, built by hand (no image lib dependency). */
function makeTestPng(r, g, b) {
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
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
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

/** Reads the current tile order from the grid via each img's src (contains media id). */
async function getGridOrder(page) {
  return page.evaluate(() => {
    const imgs = Array.from(
      document.querySelectorAll(
        'div.grid > div[aria-roledescription="sortable"] img[src*="/api/media/"]',
      ),
    );
    return imgs.map((img) => {
      const m = img.getAttribute("src").match(/\/api\/media\/([^?]+)/);
      return m ? m[1] : img.getAttribute("src");
    });
  });
}

/** Drags the tile at fromIndex to land on the tile at toIndex, using a
 * manual pointer sequence (dnd-kit's PointerSensor needs real pointer
 * events with movement past the activation distance, not a single
 * dragTo call) with intermediate mousemoves so closestCenter collision
 * detection has a chance to register the target. */
async function dragTile(page, fromIndex, toIndex) {
  const tiles = page.locator('div.grid > div[aria-roledescription="sortable"]');
  const count = await tiles.count();
  console.log(`    dragTile: found ${count} candidate tile elements`);
  const fromBox = await tiles.nth(fromIndex).boundingBox();
  const toBox = await tiles.nth(toIndex).boundingBox();
  if (!fromBox || !toBox) {
    throw new Error(
      `Could not measure tile boxes (count=${count}, fromIndex=${fromIndex}, toIndex=${toIndex}, fromBox=${JSON.stringify(fromBox)}, toBox=${JSON.stringify(toBox)})`,
    );
  }

  const startX = fromBox.x + fromBox.width / 2;
  const startY = fromBox.y + fromBox.height / 2;
  const endX = toBox.x + toBox.width / 2;
  const endY = toBox.y + toBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Move past the 8px activation distance first, in small steps, then to target.
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const y = startY + ((endY - startY) * i) / steps;
    await page.mouse.move(x, y, { steps: 2 });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
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
    console.log("1/9 Registering throwaway test account…");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 15000 });
    console.log("    logged in as", TEST_EMAIL);

    console.log("2/9 Creating a family…");
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", FAMILY_NAME);
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 15000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];
    console.log("    family slug:", familySlug);

    console.log("3/9 Creating a Person…");
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

    console.log("4/9 Uploading 3 distinct test photos (red, green, blue)…");
    const colors = [
      { name: "red", rgb: [220, 40, 40] },
      { name: "green", rgb: [40, 180, 60] },
      { name: "blue", rgb: [40, 90, 220] },
    ];
    const imagePaths = [];
    for (const c of colors) {
      const p = path.join(__dirname, `_test-photo-${c.name}.png`);
      await writeFile(p, makeTestPng(...c.rgb));
      imagePaths.push(p);
    }

    await page.goto(`${BASE_URL}/families/${familySlug}/photos`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Добавить фото" }).click();
    await page.setInputFiles("#family-photo-upload-input", imagePaths);
    await page.getByRole("button", { name: "Загрузить" }).click();
    // Wait for the panel to report all 3 done, not just the first "Готово" render.
    await page.getByText("3 из 3 загружено").waitFor({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Готово" })
      .waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Готово" }).click();
    await page.waitForLoadState("networkidle");
    console.log("    3 photos uploaded, panel dismissed");

    // uploadAll's router.refresh() is async and can race with the dialog
    // closing — poll for the grid to actually show 3 tiles instead of
    // trusting a single fixed wait; reload as a fallback if it doesn't
    // show up within a few seconds (matches what a real user would do).
    let initialOrder = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page
          .locator("div.grid img[alt]")
          .nth(2)
          .waitFor({ timeout: 8000 });
        await page.waitForTimeout(500);
        initialOrder = await getGridOrder(page);
        if (initialOrder.length === 3) break;
      } catch {
        // fall through to reload-and-retry below
      }
      console.log(
        `    attempt ${attempt + 1}: grid not showing 3 tiles yet, reloading…`,
      );
      await page.reload({ waitUntil: "networkidle" });
    }
    console.log("    initial order (media ids):", initialOrder);
    if (initialOrder.length !== 3) {
      throw new Error(
        `Expected 3 tiles in grid, found ${initialOrder.length}`,
      );
    }

    console.log("5/9 Screenshotting initial order…");
    await screenshot(page, "01-initial-order");

    console.log("6/9 Dragging first tile to last position…");
    await dragTile(page, 0, 2);
    await page.waitForTimeout(300); // let dnd-kit settle + optimistic state apply

    const orderAfterDrag = await getGridOrder(page);
    console.log("    order immediately after drop:", orderAfterDrag);
    await screenshot(page, "02-after-drag-drop");

    const orderChangedImmediately =
      JSON.stringify(orderAfterDrag) !== JSON.stringify(initialOrder);
    if (!orderChangedImmediately) {
      throw new Error(
        "DRAG_DID_NOT_REORDER: grid order identical after drag+drop — " +
          "either the drag gesture didn't register with dnd-kit's PointerSensor, " +
          "or handleDragEnd didn't update local state.",
      );
    }
    console.log("    OK — order changed immediately (optimistic UI works)");

    // Give reorderMediaAction's background transition a moment to hit the
    // server + DB before we reload.
    await page.waitForTimeout(1500);

    console.log("7/9 Reloading page to verify persistence…");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("div.grid img[alt]").nth(2).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);

    const orderAfterReload = await getGridOrder(page);
    console.log("    order after reload:", orderAfterReload);
    await screenshot(page, "03-after-reload");

    const persisted =
      JSON.stringify(orderAfterReload) === JSON.stringify(orderAfterDrag);
    if (!persisted) {
      throw new Error(
        "REORDER_NOT_PERSISTED: order after reload does not match order " +
          `after drag. after-drag=${JSON.stringify(orderAfterDrag)} ` +
          `after-reload=${JSON.stringify(orderAfterReload)} ` +
          `(initial=${JSON.stringify(initialOrder)}). ` +
          "reorderMediaAction likely did not persist sortOrder to the DB, " +
          "or the page re-fetched in original upload order.",
      );
    }
    console.log("    OK — order persisted across reload (DB write confirmed)");

    console.log("8/9 Verifying plain click still opens the lightbox…");
    await page.locator("div.grid img[alt]").first().click();
    // PhotoLightbox is a base-ui DialogPrimitive — its Close button
    // (aria-label="Закрыть") is the most reliable anchor for "did it open".
    const lightboxOpened = await page
      .getByRole("button", { name: "Закрыть" })
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    await screenshot(page, "04-lightbox-after-click");
    if (!lightboxOpened) {
      throw new Error(
        "CLICK_DID_NOT_OPEN_LIGHTBOX: after a plain click on a tile, the " +
          "lightbox's Закрыть (close) button never appeared — drag-and-drop " +
          "may have broken click-to-open navigation.",
      );
    }
    console.log("    OK — lightbox opened on plain click");

    console.log("9/9 Done.");
    console.log("\nConsole/page errors captured during run:");
    console.log(consoleErrors.length ? consoleErrors : "  none");
    console.log("\nOK — see screenshots in", SCREENSHOT_DIR);
  } catch (err) {
    console.error("\nFAILED:", err);
    await screenshot(page, "error-state");
    console.log("\nConsole/page errors captured during run:");
    console.log(consoleErrors.length ? consoleErrors : "  none");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
