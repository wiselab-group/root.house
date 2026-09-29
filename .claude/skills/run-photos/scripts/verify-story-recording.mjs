#!/usr/bin/env node
// Verifies recording a story in a family member's own voice (2026-09-29):
// the ⋮ «Начитать своим голосом» teleprompter, a real MediaRecorder take
// (Chromium's fake microphone — a test tone), saving it (direct upload +
// action), playing it back through the same player, recording again
// replacing it, and deleting the story taking the recording with it.
//
// And, above all (user: «главное, чтобы медиа файлы не перепутались»),
// that a recording never mixes with photos: the gallery, the story's photo
// carousel (media_story) and every photo count stay exactly as they were;
// the audio is one media row of kind "audio", linked only via
// story_narration, served (with byte ranges) only through its story.
//
// Reuses the newest throwaway family from verify-lightbox-strip.mjs (run
// that first) and adds its own story.
//
// Usage: node .claude/skills/run-photos/scripts/verify-story-recording.mjs

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
const OUT = path.join(__dirname, "..", "screenshots", "story-recording");

const [user] = await sql`select id, email from users where email like 'lightbox-strip-%' order by created_at desc limit 1`;
if (!user) throw new Error("run verify-lightbox-strip.mjs first");
const [family] = await sql`select id, slug from families where created_by = ${user.id} order by created_at desc limit 1`;
const photos = await sql`select id from media where family_id = ${family.id} and kind = 'photo' order by created_at`;
const body = [
  "Мы познакомились летом у моря.",
  "",
  "## Кабернеэме",
  "",
  "Он сказал, что проводит.",
  "",
  `::photo[На берегу]{media=${photos[1].id}}`,
  "",
  "Потом была осень и письма.",
].join("\n");
const storySlug = `recording-${Date.now()}`;
const [story] = await sql`insert into stories (family_id, slug, title, body, author_id)
  values (${family.id}, ${storySlug}, 'Запись знакомства', ${body}, ${user.id}) returning id`;
for (const [i, m] of photos.entries()) {
  await sql`insert into media_story (media_id, story_id, position) values (${m.id}, ${story.id}, ${i})`;
}

const counts = async () => {
  const [row] = await sql`select
    (select count(*) from media where family_id = ${family.id} and kind = 'photo')::int as photos,
    (select count(*) from media where family_id = ${family.id} and kind = 'audio')::int as audio,
    (select count(*) from media_story where story_id = ${story.id})::int as carousel,
    (select count(*) from media_story ms join media m on m.id = ms.media_id where ms.story_id = ${story.id} and m.kind <> 'photo')::int as carousel_non_photo,
    (select count(*) from media_person mp join media m on m.id = mp.media_id where m.family_id = ${family.id} and m.kind = 'audio')::int as audio_tagged,
    (select count(*) from media_album ma join media m on m.id = ma.media_id where m.family_id = ${family.id} and m.kind = 'audio')::int as audio_in_albums`;
  return row;
};
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
const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
let page;
try {
  const before = await counts();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ru-RU", permissions: ["microphone"] });
  await ctx.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style));
  });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", user.email);
  await page.press("#email", "Enter");
  await page.fill("#password", "test-password-123");
  await page.press("#password", "Enter");
  await page.waitForURL(/\/families/, { timeout: 15000 });
  const url = `${BASE_URL}/families/${family.slug}/stories/${storySlug}`;

  const record = async (label, secondsPerBlock) => {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Действия" }).click();
    await page.getByRole("menuitem", { name: "Начитать своим голосом" }).click();
    await page.getByRole("button", { name: "Начать запись" }).click();
    await page.getByRole("button", { name: "Дальше" }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(secondsPerBlock * 1000);
    await shoot(page, `${label}-recording`);
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Дальше" }).click();
      await page.waitForTimeout(secondsPerBlock * 1000);
    }
    await page.getByRole("button", { name: "Готово" }).click();
    await page.getByRole("button", { name: "Сохранить запись" }).waitFor({ timeout: 5000 });
    await shoot(page, `${label}-review`);
    await page.getByRole("button", { name: "Сохранить запись" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 30000 });
    await page.waitForLoadState("networkidle");
  };

  console.log("1. First recording");
  await record("01", 1.2);
  const [n1] = await sql`select media_id, cues, duration_ms from story_narration where story_id = ${story.id}`;
  check(Boolean(n1), "story_narration row saved");
  check(n1 && n1.cues.length === 3 && n1.cues[0].ms === 0, `3 cues from 0 (${JSON.stringify(n1?.cues)})`);
  check(n1 && n1.duration_ms > 3000, `duration ${n1?.duration_ms} ms`);
  const [m1] = await sql`select kind, mime_type from media where id = ${n1.media_id}`;
  check(m1.kind === "audio", `media row kind = ${m1.kind}, ${m1.mime_type}`);

  console.log("2. Nothing mixed with photos");
  const after = await counts();
  check(after.photos === before.photos, `photos unchanged: ${before.photos} → ${after.photos}`);
  check(after.audio === before.audio + 1, `exactly one more audio row: ${before.audio} → ${after.audio}`);
  check(after.carousel === before.carousel && after.carousel_non_photo === 0, "story carousel: same photos, no audio");
  check(after.audio_tagged === 0 && after.audio_in_albums === 0, "audio never tagged on people or in albums");
  const thumbs = await page.locator('[role="group"][aria-label="Фото истории"] button').count();
  check(thumbs === photos.length, `hero film strip still ${photos.length} photos (${thumbs})`);
  await page.goto(`${BASE_URL}/families/${family.slug}/photos`, { waitUntil: "networkidle" });
  const tiles = await page.locator("main img[alt]").count();
  check(tiles === photos.length, `gallery shows ${photos.length} photos, no audio tile (${tiles} images)`);

  console.log("3. Served only as audio, in ranges");
  const audioUrl = `${BASE_URL}/api/media/${n1.media_id}?familyId=${family.id}`;
  const whole = await page.request.get(audioUrl);
  check(whole.status() === 200 && whole.headers()["content-type"].startsWith("audio/"), `GET → ${whole.status()} ${whole.headers()["content-type"]}`);
  const part = await page.request.get(audioUrl, { headers: { Range: "bytes=0-99" } });
  check(part.status() === 206 && (await part.body()).length === 100, "Range → 206, 100 bytes");

  console.log("4. Plays through the same player");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Слушать · \d+ мин$/ }).click();
  await page.waitForTimeout(2500);
  const capsule = page.getByRole("region", { name: "Плеер истории" });
  const capsuleText = await capsule.innerText();
  check(/Читает/.test(capsuleText), `capsule says who reads: «${capsuleText.split("\n").join(" · ")}»`);
  const playing = await page.evaluate(() => [...document.querySelectorAll("audio")].length === 0);
  check(playing, "no stray <audio> in the page (player's own element)");
  // The first second is the title — it's in the hero, nothing to light in
  // the text. «Next» jumps to the lead's cue.
  await capsule.getByRole("button", { name: "Следующая фраза" }).click();
  await page.waitForTimeout(300);
  const lit = await page.evaluate(() => document.querySelector("[data-narration-now]")?.getAttribute("data-narration-block"));
  check(lit === "lead", `«Next» jumps to the lead and lights it (${lit})`);
  await shoot(page, "03-playing");
  await capsule.getByRole("button", { name: "Закрыть плеер" }).click();

  console.log("5. Recording again replaces it");
  await record("04", 0.8);
  const [n2] = await sql`select media_id from story_narration where story_id = ${story.id}`;
  const [old] = await sql`select count(*)::int as c from media where id = ${n1.media_id}`;
  check(n2.media_id !== n1.media_id && old.c === 0, "new audio, old audio row deleted");
  const again = await counts();
  check(again.audio === before.audio + 1 && again.photos === before.photos, "still one audio row, photos untouched");

  console.log("6. Deleting the story deletes its recording");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Действия" }).click();
  await page.getByRole("menuitem", { name: /Удалить историю/ }).click();
  await page.getByRole("button", { name: /^Удалить/ }).last().click();
  await page.waitForURL((u) => !u.pathname.endsWith(storySlug), { timeout: 15000 });
  const [gone] = await sql`select count(*)::int as c from media where id = ${n2.media_id}`;
  const final = await counts();
  check(gone.c === 0, "the recording's media row is gone with the story");
  check(final.photos === before.photos, `photos still ${before.photos} — deleting a story never touches them`);

  console.log(`\nErrors: ${errors.length ? errors : "none"}`);
  console.log(failures.length ? `FAILED: ${failures.length}` : "All recording checks pass");
  if (failures.length) process.exitCode = 1;
} catch (err) {
  console.error("\nFAILED:", err.message);
  await page?.screenshot({ path: path.join(OUT, "error-state.png") }).catch(() => {});
  console.log("alert:", await page?.getByRole("alert").allInnerTexts().catch(() => []));
  console.log("Errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
