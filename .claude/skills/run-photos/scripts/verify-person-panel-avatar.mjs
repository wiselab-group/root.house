#!/usr/bin/env node
// Person edit panel details (2026-09-27): no «Девичья фамилия» for men (it
// appears when the gender is switched), the portrait picker styled as the
// app's PersonThumb (rounded square + sage ring, not a circle), and no
// visible name next to it. Throwaway account/family only.
//
// Usage: node .claude/skills/run-photos/scripts/verify-person-panel-avatar.mjs

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "person-panel-avatar");
const PHOTO = path.join(__dirname, "_test-photo-portrait.png");
const runId = Date.now();

function check(ok, label) {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
}

async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
}

async function openPanel(page) {
  await page.getByRole("button", { name: "Действия" }).click();
  await page.getByRole("menuitem", { name: "Редактировать" }).click();
  await page.locator("#firstName").waitFor({ timeout: 20000 });
  await page.waitForTimeout(700);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  try {
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Panel Avatar Verifier");
    await page.fill("#email", `panel-avatar-${runId}@example.test`);
    await page.fill("#password", "verify-test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 30000 });
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Проверка аватара");
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 30000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, { waitUntil: "networkidle" });
    await page.fill("#firstName", "Александр");
    await page.fill("#lastName", "Купчик");
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/people\/(?!new$)[^/]+$/, { timeout: 30000 });
    const profileUrl = page.url();
    const personSlug = new URL(profileUrl).pathname.split("/").pop();
    await sql`update persons set gender='male' where slug=${personSlug} and family_id=(select id from families where slug=${familySlug})`;

    await page.goto(profileUrl, { waitUntil: "networkidle" });
    await openPanel(page);
    check((await page.locator("#maidenName").count()) === 0, "man: no «Девичья фамилия»");
    check(
      (await page.getByRole("dialog").getByText("Александр Купчик", { exact: true }).count()) === 0,
      "no visible name next to the portrait",
    );
    const title = await page.getByRole("dialog").getAttribute("aria-labelledby");
    check(Boolean(title), "the dialog still has an accessible title");
    await shoot(page, "01-man-no-photo");

    await page.selectOption("#gender", "female");
    check(await page.locator("#maidenName").isVisible(), "switching to female shows «Девичья фамилия»");
    await page.selectOption("#gender", "male");
    check((await page.locator("#maidenName").count()) === 0, "…and back to male hides it");

    await page.getByRole("dialog").locator('input[type="file"]').setInputFiles(PHOTO);
    await page.getByRole("dialog").locator("img").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const radius = await page
      .getByRole("dialog")
      .locator('[role="button"][aria-busy]')
      .first()
      .evaluate((el) => getComputedStyle(el).borderRadius);
    check(radius !== "9999px" && radius !== "50%", `portrait is a rounded square (border-radius ${radius})`);
    await shoot(page, "02-man-with-photo");
    const box = await page.getByRole("dialog").locator("header").boundingBox();
    await page.screenshot({ path: path.join(OUT, "03-header-closeup.png"), clip: { x: box.x, y: box.y, width: box.width, height: box.height + 10 } });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
