#!/usr/bin/env node
// Verifies a voice on the Person Profile (2026-09-29, mocks «A»+«B»): the
// hero's «Добавить голос», recording one with Chromium's fake microphone,
// uploading a second as a file (a generated WAV — a «digitized tape»),
// the hero capsule playing through the family-wide player, «Ещё 1
// запись» listing both with waveforms, «Показывать в шапке», deleting.
//
// And that a voice never mixes with photos: photo counts stay, the audio
// is a media row of kind "audio" linked only via person_voice, never
// tagged on people or put in albums.
//
// Reuses the newest throwaway family from verify-lightbox-strip.mjs (run
// that first).
//
// Usage: node .claude/skills/run-photos/scripts/verify-person-voice.mjs

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "person-voice");

const [user] = await sql`select id, email from users where email like 'lightbox-strip-%' order by created_at desc limit 1`;
if (!user) throw new Error("run verify-lightbox-strip.mjs first");
const [family] = await sql`select id, slug from families where created_by = ${user.id} order by created_at desc limit 1`;
const [person] = await sql`select id, slug from persons where family_id = ${family.id} order by photo_media_id is null, created_at limit 1`;
// Start clean: earlier runs' voices on this person.
for (const v of await sql`select media_id from person_voice where person_id = ${person.id}`) {
  await sql`delete from media where id = ${v.media_id}`;
}

/** 4 s of a swelling 220 Hz tone as a 16-bit mono WAV. */
async function makeWav(file) {
  const rate = 8000;
  const n = rate * 4;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const env = Math.abs(Math.sin((i / n) * Math.PI * 3));
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * env * 20000), 44 + i * 2);
  }
  await writeFile(file, buf);
}

const counts = async () => {
  const [row] = await sql`select
    (select count(*) from media where family_id = ${family.id} and kind = 'photo')::int as photos,
    (select count(*) from media where family_id = ${family.id} and kind = 'audio')::int as audio,
    (select count(*) from media_person mp join media m on m.id = mp.media_id where m.family_id = ${family.id} and m.kind = 'audio')::int as audio_tagged,
    (select count(*) from media_album ma join media m on m.id = ma.media_id where m.family_id = ${family.id} and m.kind = 'audio')::int as audio_in_albums`;
  return row;
};
const voices = () => sql`select v.*, m.kind, m.mime_type from person_voice v join media m on m.id = v.media_id
  where v.person_id = ${person.id} order by v.position, v.created_at`;
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
const wav = path.join(OUT, "tape.wav");
await makeWav(wav);
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
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", user.email);
  await page.press("#email", "Enter");
  await page.fill("#password", "test-password-123");
  await page.press("#password", "Enter");
  await page.waitForURL(/\/families/, { timeout: 15000 });
  const url = `${BASE_URL}/families/${family.slug}/people/${person.slug}`;
  const hero = page.locator("main header").first();

  console.log("1. Empty: «Добавить голос» in the hero");
  await page.goto(url, { waitUntil: "networkidle" });
  const addPill = hero.getByRole("button", { name: "Добавить голос" });
  check(await addPill.isVisible(), "«Добавить голос» shown to the owner");
  await shoot(page, "01-empty");

  console.log("2. Record one with the microphone");
  await addPill.click();
  await page.getByRole("dialog").getByRole("button", { name: "Записать" }).click();
  await page.getByRole("button", { name: "Остановить" }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Остановить" }).click();
  await page.locator("#recordedYear").waitFor({ timeout: 5000 });
  await page.fill("#recordedYear", "1967");
  await shoot(page, "02-dialog-recorded");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 30000 });
  await page.waitForLoadState("networkidle");
  const [v1] = await voices();
  check(Boolean(v1) && v1.kind === "audio", `person_voice + audio media (${v1?.mime_type})`);
  check(v1?.recorded_date_year === 1967 && v1?.speaker === "self", "year 1967, the person's own voice");
  check(v1?.duration_ms > 2000, `duration ${v1?.duration_ms} ms`);
  check(Array.isArray(v1?.peaks) && v1.peaks.length === 64, `waveform measured (${v1?.peaks?.length} bars)`);

  console.log("3. The hero capsule plays through the family player");
  const capsule = hero.getByRole("button", { name: "Слушать: Голос" });
  check(await capsule.waitFor({ timeout: 10000 }).then(() => true, () => false), "capsule «Голос» in the hero");
  check(/1967/.test(await capsule.innerText()), `capsule shows the year: «${(await capsule.innerText()).replace(/\n/g, " · ")}»`);
  await shoot(page, "03-capsule");
  await capsule.click();
  await page.waitForTimeout(1500);
  const player = page.getByRole("region", { name: "Плеер истории" });
  check(await player.isVisible(), "family player capsule appears");
  check(await hero.getByRole("button", { name: "Пауза: Голос" }).isVisible(), "hero capsule turns to pause");
  await page.waitForTimeout(1500);
  const clockText = await player.innerText();
  check(!/0:00 \//.test(clockText), `time runs (${clockText.replace(/\n/g, " ")})`);
  await shoot(page, "04-playing");

  console.log("4. Upload a file: someone telling about the person");
  await hero.getByRole("button", { name: "Записи голоса" }).click();
  await page.getByRole("button", { name: "Добавить запись" }).click();
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles(wav);
  await page.getByText("Рассказ о человеке").click();
  await page.fill("#voice-narrator", "Галина");
  await page.fill("#recordedYear", "2019");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 30000 });
  await page.waitForLoadState("networkidle");
  const [, v2] = await voices();
  check(v2?.speaker === "narrator" && v2?.narrator_name === "Галина", "second: told by Галина");
  check(v2?.mime_type?.includes("wav") && v2?.duration_ms > 3500, `WAV, ${v2?.duration_ms} ms`);
  const more = hero.getByRole("button", { name: "Ещё 1 запись" });
  check(await more.waitFor({ timeout: 10000 }).then(() => true, () => false), "«Ещё 1 запись» beside the capsule");
  await more.click();
  await page.waitForTimeout(500);
  const list = page.locator('[data-slot="popover-content"]');
  check((await list.locator("li").count()) === 2, "list holds both recordings");
  check(await list.getByText("Рассказывает Галина").isVisible(), "«Рассказывает Галина» in the list");
  await shoot(page, "05-list");

  console.log("5. «Показывать в шапке»");
  await list.getByRole("button", { name: "Действия с записью" }).nth(1).click();
  await page.getByRole("menuitem", { name: "Показывать в шапке" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const [first] = await voices();
  check(first?.id === v2.id, "Галина's recording is now first");
  check(
    await hero.getByRole("button", { name: /Рассказывает Галина$/ }).waitFor({ timeout: 10000 }).then(() => true, () => false),
    "hero shows it",
  );

  console.log("6. Nothing mixed with photos");
  const after = await counts();
  check(after.photos === before.photos, `photos unchanged: ${before.photos} → ${after.photos}`);
  check(after.audio === before.audio + 2, `two more audio rows: ${before.audio} → ${after.audio}`);
  check(after.audio_tagged === 0 && after.audio_in_albums === 0, "audio never tagged on people or in albums");
  const audioUrl = `${BASE_URL}/api/media/${v1.media_id}?familyId=${family.id}`;
  const part = await page.request.get(audioUrl, { headers: { Range: "bytes=0-99" } });
  check(part.status() === 206, `served in ranges to someone who sees the person (${part.status()})`);

  console.log("7. Delete one");
  await page.keyboard.press("Escape");
  await hero.getByRole("button", { name: "Ещё 1 запись" }).click();
  await list.getByRole("button", { name: "Действия с записью" }).nth(1).click();
  await page.getByRole("menuitem", { name: "Удалить" }).click();
  await list.getByRole("alert").getByRole("button", { name: "Удалить" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const rest = await voices();
  const [gone] = await sql`select count(*)::int as c from media where id = ${v1.media_id}`;
  check(rest.length === 1 && gone.c === 0, "one left, the deleted one's media row gone");
  await page.keyboard.press("Escape");
  await shoot(page, "06-after-delete");

  console.log("8. Phone");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "networkidle" });
  await shoot(page, "07-phone");

  console.log(`\nErrors: ${errors.length ? errors : "none"}`);
  console.log(failures.length ? `FAILED: ${failures.length}` : "All voice checks pass");
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
