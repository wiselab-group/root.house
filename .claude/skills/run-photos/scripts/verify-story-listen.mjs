#!/usr/bin/env node
// Verifies the «Слушать» story player (device voice, no AI — 2026-09-29):
// the hero button, the player capsule, the highlight of the paragraph being
// read, the hero photo following the text, pause / resume from the
// remembered spot.
//
// Headless Chromium has no speech voices, so speechSynthesis is replaced by
// a stub before the page loads: one Russian voice, and each utterance
// "speaks" for 2.5 s, then fires its end event. That checks OUR logic, not
// the sound — listen on a real device for that.
//
// Reuses the newest throwaway family from verify-lightbox-strip.mjs (created on
// demand by useLightboxFixture, deleted afterwards) and adds a story with chapters and photos placed in the text.
//
// Usage: node .claude/skills/run-photos/scripts/verify-story-listen.mjs

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useLightboxFixture } from "./_test-accounts.mjs";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "story-listen");

const fixture = await useLightboxFixture();
const { user } = fixture;
const [family] = await sql`select id, slug from families where created_by = ${user.id} order by created_at desc limit 1`;
const media = await sql`select id from media where family_id = ${family.id} and kind = 'photo' order by created_at`;
const body = [
  "Мы познакомились летом у моря. Он чинил велосипед у дороги.",
  "",
  "## Кабернеэме",
  "",
  "Он сказал, что проводит. Мы шли вдоль сосен почти час.",
  "",
  `::photo[На берегу]{media=${media[1].id}}`,
  "",
  "## Письма",
  "",
  "Потом была осень и письма. Каждую пятницу я ждала почтальона.",
  "",
  `::photo[Письмо]{media=${media[2].id}}`,
  "",
  "За несколько дней до росписи мы снова поехали к морю.",
].join("\n");
const storySlug = `listen-${Date.now()}`;
const [story] = await sql`insert into stories (family_id, slug, title, body, author_id)
  values (${family.id}, ${storySlug}, 'История знакомства', ${body}, ${user.id}) returning id`;
for (const [i, m] of media.entries()) {
  await sql`insert into media_story (media_id, story_id, position) values (${m.id}, ${story.id}, ${i})`;
}

function stubSpeech() {
  const voice = { name: "Милена (улучшенный)", lang: "ru-RU", default: true, localService: true, voiceURI: "stub-ru" };
  let current = null;
  let timer = null;
  window.__spoken = [];
  const synth = new EventTarget();
  synth.getVoices = () => [voice];
  synth.speak = (u) => {
    current = u;
    window.__spoken.push(u.text);
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

const shoot = async (page, name, full = false) => {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: full });
  console.log(`  -> ${path.relative(process.cwd(), file)}`);
};
const currentSlide = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role="group"][aria-label="Фото истории"] button')]
      .findIndex((b) => b.getAttribute("aria-pressed") === "true"),
  );
const lit = (page) =>
  page.evaluate(() => document.querySelector("[data-narration-now]")?.getAttribute("data-narration-block") ?? null);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ru-RU" });
  await ctx.addInitScript(stubSpeech);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", user.email);
  await page.press("#email", "Enter");
  await page.fill("#password", "test-password-123");
  await page.press("#password", "Enter");
  await page.waitForURL(/\/families/, { timeout: 15000 });

  const url = `${BASE_URL}/families/${family.slug}/stories/${storySlug}`;
  await page.goto(url, { waitUntil: "networkidle" });
  const listen = page.getByRole("button", { name: /^Слушать · \d+ мин$/ });
  await listen.waitFor({ timeout: 10000 });
  const box = await listen.boundingBox();
  if (box.width > 260) throw new Error(`the button is ${box.width}px wide — should fit its label`);
  console.log(`    «${await listen.innerText()}», ${Math.round(box.width)}px wide`);
  await shoot(page, "01-listen-button");

  await listen.click();
  await page.getByRole("region", { name: "Плеер истории" }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(3000); // past the title, into the lead
  const block1 = await lit(page);
  const slide = await currentSlide(page);
  // Pause right away — screenshots are slow, the story would run on.
  await page.getByRole("button", { name: "Пауза" }).first().click({ timeout: 3000 });
  const spokenAtPause = await page.evaluate(() => window.__spoken.length);
  console.log(`    reading block «${block1}», hero photo #${slide}, ${spokenAtPause} phrases spoken`);
  if (block1 !== "lead") throw new Error(`expected the lead lit, got ${block1}`);
  if (slide < 1) throw new Error("the hero photo did not follow the text");
  await page.waitForTimeout(3000);
  if ((await page.evaluate(() => window.__spoken.length)) !== spokenAtPause)
    throw new Error("kept speaking after pause");
  console.log("    pause holds");
  await shoot(page, "02-paused-top");
  await page.evaluate(() =>
    // display:contents wrapper has no box — scroll to the paragraph in it.
    document.querySelector("[data-narration-now] > *")?.scrollIntoView({ block: "center" }),
  );
  await shoot(page, "03-highlight-in-text");

  await page.reload({ waitUntil: "networkidle" });
  const resume = page.getByRole("button", { name: "Продолжить слушать" });
  await resume.waitFor({ timeout: 5000 });
  await resume.click();
  await page.waitForTimeout(300);
  const first = await page.evaluate(() => window.__spoken[0]);
  console.log(`    after reload it resumes with: «${first}»`);
  if (first === "История знакомства") throw new Error("started over instead of resuming");
  await page.scrollBy?.(0, 0);
  await shoot(page, "04-resumed");
  // Phone: «Слушать» and «Все фото» share the row under the strip.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "ru-RU",
    storageState: await ctx.storageState(),
  });
  await phone.addInitScript(stubSpeech);
  const mp = await phone.newPage();
  await mp.goto(url, { waitUntil: "networkidle" });
  await mp.waitForTimeout(800);
  await shoot(mp, "05-phone");
  console.log("\nErrors:", errors.length ? errors : "none");
} catch (err) {
  console.error("\nFAILED:", err.message);
  console.log("Errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fixture.release();
}
