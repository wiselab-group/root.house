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

function makeTestPng(width, height, rgb) {
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
      raw[px] = rgb[0];
      raw[px + 1] = rgb[1];
      raw[px + 2] = rgb[2];
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

    // Two photos with different aspect ratios — a wide one and a tall one —
    // so switching between them while tagging mode is already on produces a
    // visibly different contain rectangle each time (needed to catch a
    // stale-frame flash: same-shape photos would hide the bug).
    const widePath = path.join(__dirname, "_test-photo-wide.png");
    const tallPath = path.join(__dirname, "_test-photo-tall.png");
    await writeFile(widePath, makeTestPng(40, 10, [200, 90, 60]));
    await writeFile(tallPath, makeTestPng(10, 40, [60, 120, 90]));
    await page.goto(`${BASE_URL}/families/${familySlug}/photos`, {
      waitUntil: "networkidle",
    });
    for (const imagePath of [widePath, tallPath]) {
      await page.getByRole("button", { name: "Добавить фото" }).click();
      await page.setInputFiles("#family-photo-upload-input", imagePath);
      await page.getByRole("button", { name: "Загрузить" }).click();
      await page.getByRole("button", { name: "Готово" }).waitFor({ timeout: 20000 });
      await page.getByRole("button", { name: "Готово" }).click();
      await page.waitForLoadState("networkidle");
    }

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
      const img = Array.from(
        document.querySelectorAll("img.object-contain"),
      ).find((el) => {
        const overlay = el.parentElement?.querySelector("div.absolute.inset-0");
        return overlay && getComputedStyle(overlay).cursor === "none";
      });
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
    const boundingBox = await imageHandle.asElement()?.boundingBox();
    if (!boundingBox) throw new Error("could not measure image box");

    // Move mouse over the photo and inspect cursor + marker element.
    await page.mouse.move(
      boundingBox.x + boundingBox.width / 2,
      boundingBox.y + boundingBox.height / 2,
    );
    await page.waitForTimeout(150);
    const cursorAndMarker = await page.evaluate(() => {
      const img = Array.from(
        document.querySelectorAll("img.object-contain"),
      ).find((el) => {
        const overlay = el.parentElement?.querySelector("div.absolute.inset-0");
        return overlay && getComputedStyle(overlay).cursor === "none";
      });
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

    console.log("Switching to next photo while tagging mode stays on…");
    const rectBeforeSwitch = frameDebug.ringDivStyle;
    const nextButton = page.getByRole("button", { name: "Следующее фото" });
    const hasNext = await nextButton.count();
    if (hasNext) {
      await nextButton.click();
      // Rapid-poll right after navigation — a stale-frame flash would show
      // up as a rect matching the PREVIOUS photo's dimensions in an early
      // sample, before settling on the new photo's own rect.
      // The current slide is the one whose PhotoTagLayer overlay has
      // cursor:none (taggingMode on) — the prev/next neighbor slots always
      // render with taggingMode=false, so this disambiguates the two <img>
      // elements now in the DOM (one per visible track slot).
      const samples = [];
      for (let i = 0; i < 15; i++) {
        const sample = await page.evaluate(() => {
          const imgs = Array.from(
            document.querySelectorAll("img.object-contain"),
          );
          const current = imgs.find((img) => {
            const overlay = img.parentElement?.querySelector(
              "div.absolute.inset-0",
            );
            return overlay && getComputedStyle(overlay).cursor === "none";
          });
          const ringDiv = current?.parentElement?.querySelector(
            "[aria-hidden].ring-primary",
          );
          return {
            currentNaturalWidth: current?.naturalWidth,
            ring: ringDiv
              ? { w: ringDiv.style.width, h: ringDiv.style.height }
              : "no-ring",
          };
        });
        samples.push(sample);
        await page.waitForTimeout(60);
      }
      console.log("  rect before switch:", rectBeforeSwitch);
      console.log("  rect samples after switch (current slide only):");
      for (const s of samples) console.log("   ", JSON.stringify(s));
      const staleFlash = samples.some(
        (s) =>
          s.ring !== "no-ring" &&
          rectBeforeSwitch &&
          s.ring.w === rectBeforeSwitch.width &&
          s.ring.h === rectBeforeSwitch.height,
      );
      console.log("  stale-frame flash on CURRENT slide (should be false):", staleFlash);
      await screenshot(page, "after-photo-switch");
    } else {
      console.log("  only one photo uploaded — skipping switch check");
    }

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
