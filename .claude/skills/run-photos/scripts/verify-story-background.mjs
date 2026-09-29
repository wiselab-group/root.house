#!/usr/bin/env node
// Verifies listening in the background (2026-09-29): «Слушать» on a story,
// then going about the family — family home, the tree — the story keeps
// playing (the player lives in the family layout, ListeningHost), the
// capsule shows the story's title as a link back and sits above the tree's
// dock; back on the story, the capsule shows the chapter and the text is
// lit again. «Слушать» on another story switches the player to it.
//
// speechSynthesis is stubbed as in verify-story-listen.mjs (each phrase
// "speaks" for 2.5 s) — this checks our logic, not the sound.
//
// Reuses the newest throwaway family from verify-lightbox-strip.mjs.
//
// Usage: node .claude/skills/run-photos/scripts/verify-story-background.mjs

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
const OUT = path.join(__dirname, "..", "screenshots", "story-background");

const [user] = await sql`select id, email from users where email like 'lightbox-strip-%' order by created_at desc limit 1`;
if (!user) throw new Error("run verify-lightbox-strip.mjs first");
const [family] = await sql`select id, slug from families where created_by = ${user.id} order by created_at desc limit 1`;
const long = Array.from({ length: 14 }, (_, i) => `Это ${i + 1}-е предложение истории.`).join(" ");
const stamp = Date.now();
const makeStory = async (slug, title) => {
  await sql`insert into stories (family_id, slug, title, body, author_id)
    values (${family.id}, ${slug}, ${title}, ${long}, ${user.id})`;
  return `${BASE_URL}/families/${family.slug}/stories/${slug}`;
};
const firstUrl = await makeStory(`bg-a-${stamp}`, "Первая история");
const secondUrl = await makeStory(`bg-b-${stamp}`, "Вторая история");

function stubSpeech() {
  const voice = { name: "Милена", lang: "ru-RU", default: true, localService: true, voiceURI: "stub-ru" };
  let current = null;
  let timer = null;
  window.__spoken = [];
  const synth = new EventTarget();
  synth.getVoices = () => [voice];
  synth.speak = (u) => {
    current = u;
    window.__spoken.push(u.text);
    setTimeout(() => u.onstart?.({}), 20);
    timer = setTimeout(() => {
      if (current === u) {
        current = null;
        u.onend?.({});
      }
    }, 2500);
  };
  synth.cancel = () => {
    clearTimeout(timer);
    const u = current;
    current = null;
    u?.onerror?.({ error: "interrupted" });
  };
  synth.pause = () => {};
  synth.resume = () => {};
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  const style = document.createElement("style");
  style.textContent = "nextjs-portal{display:none!important}";
  document.addEventListener("DOMContentLoaded", () => document.head.append(style));
}

const failures = [];
const check = (ok, label) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures.push(label);
};
const shoot = async (page, name) => {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
let page;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ru-RU" });
  await ctx.addInitScript(stubSpeech);
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", user.email);
  await page.press("#email", "Enter");
  await page.fill("#password", "test-password-123");
  await page.press("#password", "Enter");
  await page.waitForURL(/\/families/, { timeout: 15000 });

  const capsule = page.getByRole("region", { name: "Плеер истории" });
  const spoken = () => page.evaluate(() => window.__spoken.length);

  console.log("1. Listen, then leave the story");
  await page.goto(firstUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Слушать · \d+ мин$/ }).click();
  await capsule.waitFor({ timeout: 5000 });
  // Client-side navigation, as the reader does it: the breadcrumb.
  await page.getByRole("link", { name: /^Соколовы/ }).first().click();
  await page.waitForURL((u) => u.pathname === `/families/${family.slug}`, { timeout: 10000 });
  const before = await spoken();
  await page.waitForTimeout(5500);
  const after = await spoken();
  check(await capsule.isVisible(), "capsule still there on the family home");
  check(after > before, `still reading: ${before} → ${after} phrases`);
  const back = capsule.getByRole("link", { name: "Первая история" });
  check(await back.isVisible(), "capsule shows the story's title as a link");
  await shoot(page, "01-family-home");

  console.log("2. The tree: above its dock");
  // A fresh start on the story (goto reloads the page, which stops any
  // player), then the tree by client-side navigation, as a link would.
  await page.goto(firstUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^(Слушать|Продолжить слушать)/ }).first().click();
  await capsule.waitFor({ timeout: 5000 });
  await page.evaluate((href) => window.next.router.push(href), `/families/${family.slug}/tree`);
  await page.waitForURL(/\/tree/, { timeout: 15000 });
  await page.waitForTimeout(2500);
  const dock = await page.locator("[data-bottom-bar]").first().boundingBox();
  const cap = await capsule.boundingBox();
  check(Boolean(dock && cap), "tree dock and capsule both on screen");
  if (dock && cap) {
    const dockControls = await page.locator("[data-bottom-bar] > div").first().boundingBox();
    check(cap.y + cap.height <= dockControls.y + 1, `capsule above the dock (capsule bottom ${Math.round(cap.y + cap.height)}, dock top ${Math.round(dockControls.y)})`);
  }
  await shoot(page, "02-tree");

  console.log("3. Back to the story by the capsule's link");
  await capsule.getByRole("link", { name: "Первая история" }).click();
  await page.waitForURL((u) => u.href === firstUrl, { timeout: 10000 });
  await page.waitForTimeout(3000);
  check((await capsule.getByRole("link").count()) === 0, "on the story: chapter, no link");
  const lit = await page.evaluate(() => document.querySelector("[data-narration-now]")?.getAttribute("data-narration-block") ?? null);
  check(lit !== null, `text lit again (${lit})`);
  check(await page.getByRole("button", { name: "Пауза" }).first().isVisible(), "hero button says «Пауза»");

  console.log("4. Another story switches the player");
  await page.evaluate((href) => window.next.router.push(href), new URL(secondUrl).pathname);
  await page.waitForURL((u) => u.href === secondUrl, { timeout: 10000 });
  await page.waitForTimeout(800);
  check(await capsule.getByRole("link", { name: "Первая история" }).isVisible(), "first story still playing, linked");
  await page.getByRole("button", { name: /^Слушать · \d+ мин$/ }).click();
  await page.waitForTimeout(1500);
  check((await capsule.getByRole("link").count()) === 0, "capsule now on the second story (no link — we're on it)");
  const last = await page.evaluate(() => window.__spoken.at(-1));
  check(last === "Вторая история" || /предложение/.test(last), `reading the second story («${last}»)`);
  await shoot(page, "03-switched");

  console.log(`\nErrors: ${errors.length ? errors : "none"}`);
  console.log(failures.length ? `FAILED: ${failures.length}` : "All background-listening checks pass");
  if (failures.length) process.exitCode = 1;
} catch (err) {
  console.error("\nFAILED:", err.message);
  await page?.screenshot({ path: path.join(OUT, "error-state.png") }).catch(() => {});
  console.log("Errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
