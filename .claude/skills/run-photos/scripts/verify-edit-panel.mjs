#!/usr/bin/env node
// Verifies the editing surfaces chosen from the editing mock (2026-09-27):
//  A/C — person edit as an EditPanel over the profile (intercepted
//        @modal/(.)edit): right panel on desktop, bottom sheet on phone,
//        unsaved-changes prompt, save closes it and leaves no /edit entry
//        in history; a hard load of /edit renders the same profile + panel,
//        and closing it lands on the profile URL.
//  D   — story full-page editor with a server-side draft.
// Throwaway account + family only; the story row is inserted with SQL
// scoped to this run's own family.
//
// Usage: node .claude/skills/run-photos/scripts/verify-edit-panel.mjs
// Requires: dev server at BASE_URL (default http://localhost:3000),
// DATABASE_URL in .env.local.

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteTestAccounts } from "./_test-accounts.mjs";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots", "edit-panel");
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

async function openEditFromMenu(page) {
  await page.getByRole("button", { name: "Действия" }).click();
  await page.getByRole("menuitem", { name: "Редактировать" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 20000 });
  await page.locator("#firstName").waitFor({ timeout: 20000 });
  // Let the slide-in transition settle before screenshots.
  await page.waitForTimeout(700);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  try {
    console.log("1/6 register, family, person");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Edit Panel Verifier");
    await page.fill("#email", `edit-panel-${runId}@example.test`);
    await page.fill("#password", "verify-test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 30000 });
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Проверка редактирования");
    await page.getByRole("button", { name: "Создать семью" }).click();
    await page.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 30000 });
    const familySlug = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`${BASE_URL}/families/${familySlug}/people/new`, { waitUntil: "networkidle" });
    await page.fill("#firstName", "Виктор");
    await page.fill("#lastName", "Купчик");
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.waitForURL(/\/people\/(?!new$)[^/]+$/, { timeout: 30000 });
    const profileUrl = page.url();
    const personPath = new URL(profileUrl).pathname;

    console.log("2/6 desktop panel");
    await page.goto(`${BASE_URL}/families/${familySlug}`, { waitUntil: "networkidle" });
    await page.goto(profileUrl, { waitUntil: "networkidle" });
    await openEditFromMenu(page);
    check(new URL(page.url()).pathname === `${personPath}/edit`, "URL is /edit while panel open");
    check(await page.locator("main h1", { hasText: "Виктор Купчик" }).isVisible(), "profile stays rendered under the panel");
    await shoot(page, "01-desktop-panel");

    await page.fill("#middleName", "Иванович");
    await page.keyboard.press("Escape");
    const prompt = page.getByRole("alertdialog");
    check(await prompt.isVisible(), "Esc with edits asks before closing");
    await page.waitForTimeout(400); // let the prompt's fade-in finish
    await shoot(page, "02-desktop-discard-prompt");
    await prompt.getByRole("button", { name: "Остаться" }).click();
    check(await page.getByRole("dialog").isVisible(), "«Остаться» keeps the panel open");

    // A server-side validation error must not reset what was typed.
    await page.fill("#religion", "а".repeat(130));
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("dialog").locator("p.text-destructive").first().waitFor({ timeout: 10000 });
    check(
      (await page.locator("#middleName").inputValue()) === "Иванович",
      "person: typed fields survive a validation error",
    );
    await page.fill("#religion", "");

    await page.fill("#lastName", "Купчик-Ушкар");
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
    check(new URL(page.url()).pathname === personPath, "save closes panel back to profile URL");
    await page.locator("main h1", { hasText: "Купчик-Ушкар" }).waitFor({ timeout: 20000 });
    check(true, "profile shows the saved name");
    await shoot(page, "03-desktop-after-save");
    await page.goBack({ waitUntil: "networkidle" });
    check(!page.url().includes("/people/"), `Back leaves the profile (no stale /edit entry): ${new URL(page.url()).pathname}`);

    console.log("3/6 plain close + browser Back");
    await page.goto(profileUrl, { waitUntil: "networkidle" });
    await openEditFromMenu(page);
    await page.getByRole("dialog").getByRole("button", { name: "Закрыть" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
    check(new URL(page.url()).pathname === personPath, "✕ without edits closes straight away");
    await openEditFromMenu(page);
    await page.goBack();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
    check(new URL(page.url()).pathname === personPath, "browser Back closes the panel");

    console.log("4/6 hard load of /edit");
    await page.goto(`${profileUrl}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("dialog").waitFor({ timeout: 20000 });
    await page.locator("#firstName").waitFor({ timeout: 20000 });
    await page.waitForTimeout(700);
    check(
      await page.locator("main h1", { hasText: "Купчик" }).isVisible(),
      "hard load: the profile with the same panel over it",
    );
    await shoot(page, "04-hard-load-edit-page");
    await page.getByRole("dialog").getByRole("button", { name: "Закрыть" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
    check(new URL(page.url()).pathname === personPath, "hard load: closing lands on the profile URL");

    console.log("5/6 phone sheet");
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await phone.context().addCookies(await page.context().cookies());
    await phone.goto(profileUrl, { waitUntil: "networkidle" });
    await openEditFromMenu(phone);
    await shoot(phone, "05-phone-sheet");
    await phone.locator("#privacyLevel, [name=privacyLevel]").first().scrollIntoViewIfNeeded();
    await shoot(phone, "06-phone-sheet-scrolled");

    console.log("6/6 story editor");
    const [fam] = await sql`select id from families where slug=${familySlug}`;
    const [person] = await sql`select id, created_by from persons where family_id=${fam.id} limit 1`;
    const storySlug = `most-${runId}`;
    const [story] = await sql`insert into stories (family_id, slug, title, body, author_id)
      values (${fam.id}, ${storySlug}, 'Мост через Неман', 'Летом 1983 года папа почти не бывал дома.', ${person.created_by}) returning id`;
    await sql`insert into story_person (story_id, person_id) values (${story.id}, ${person.id})`;
    const editUrl = `${BASE_URL}/families/${familySlug}/stories/${storySlug}/edit`;
    await page.goto(editUrl, { waitUntil: "networkidle" });
    await shoot(page, "07-story-editor");
    await page.locator("#body").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Мостотрест строил новый пролёт у Гродно.");
    await page.getByText("Черновик сохранён", { exact: true }).first().waitFor({ timeout: 10000 });
    check(true, "autosave shows «Черновик сохранён»");
    await shoot(page, "08-story-draft-saved");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Есть несохранённые правки этой истории.").waitFor({ timeout: 10000 });
    check(true, "reload offers the leftover draft");
    await shoot(page, "09-story-draft-banner");
    await page.getByRole("button", { name: "Восстановить" }).click();
    check((await page.locator("#body").inputValue()).includes("Гродно"), "restore brings the draft text back");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await page.waitForURL(new RegExp(`/stories/${storySlug}$`), { timeout: 20000 });
    check(await page.getByText("Гродно", { exact: false }).first().isVisible(), "saved story shows the new text");
    await phone.goto(editUrl, { waitUntil: "networkidle" });
    await shoot(phone, "10-phone-story-editor");

    console.log("7/7 events");
    const [dated] = await sql`insert into events (family_id, type, title, date_year, date_precision, created_by)
      values (${fam.id}, 'migration', 'Переезд в Гродно', 1984, 'year_only', ${person.created_by}) returning id`;
    const [undated] = await sql`insert into events (family_id, type, title, created_by)
      values (${fam.id}, 'other', 'Рыбалка на Немане', ${person.created_by}) returning id`;
    for (const ev of [dated, undated])
      await sql`insert into event_participants (event_id, person_id, role) values (${ev.id}, ${person.id}, 'subject')`;
    const eventUrl = `${BASE_URL}/families/${familySlug}/events/${dated.id}`;
    const eventPath = new URL(eventUrl).pathname;
    await page.goto(eventUrl, { waitUntil: "networkidle" });
    // LinkButton renders an <a role="button"> (base-ui Button).
    await page.locator(`a[href="${eventPath}/edit"]`).click();
    await page.getByRole("dialog").waitFor({ timeout: 20000 });
    await page.locator("#title").waitFor({ timeout: 20000 });
    await page.waitForTimeout(700);
    check(new URL(page.url()).pathname === `${eventPath}/edit`, "event: URL is /edit while panel open");
    await shoot(page, "11-event-panel");
    const roleSelects = page.getByRole("dialog").locator('select[aria-label^="Роль"], li select');
    check((await roleSelects.count()) === 0, "event: no one-option role dropdown for «Переезд»");
    await page.selectOption("#type", "baptism");
    await roleSelects.first().waitFor({ timeout: 5000 });
    const box = await roleSelects.first().boundingBox();
    const chevron = await page.getByRole("dialog").locator("li svg.lucide-chevron-down").first().boundingBox();
    check(
      box && chevron && chevron.x > box.x && chevron.x + chevron.width < box.x + box.width,
      "event: «Крещение» offers the role choice, chevron inside the select",
    );
    await page.getByRole("dialog").locator("li").first().scrollIntoViewIfNeeded();
    await shoot(page, "11b-event-panel-baptism-roles");
    await page.selectOption("#type", "migration");
    await page.fill("#description", "Переехали всей семьёй осенью.");
    // Over the schema's 200-char max: passes the browser's `required`, fails
    // on the server — a real round-trip error.
    await page.fill("#title", "П".repeat(210));
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("dialog").locator("p.text-destructive").first().waitFor({ timeout: 10000 });
    check(
      (await page.locator("#description").inputValue()) === "Переехали всей семьёй осенью.",
      "event: typed fields survive a validation error",
    );
    await page.fill("#title", "Переезд в Гродно, 1984");
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
    check(new URL(page.url()).pathname === eventPath, "event: save closes panel back to event URL");
    await page.getByRole("heading", { name: "Переезд в Гродно, 1984" }).waitFor({ timeout: 20000 });
    check(true, "event page shows the saved title");
    await page.goto(`${eventUrl}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("dialog").waitFor({ timeout: 20000 });
    check(
      // CSS, not a role query: the modal panel marks the page behind it
      // inert, so it's out of the accessibility tree while open.
      await page.locator("main h1", { hasText: "Переезд в Гродно" }).isVisible(),
      "event: hard load shows the event page with the panel over it",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 10000 });
    check(new URL(page.url()).pathname === eventPath, "event: closing lands on the event URL");

    await page.goto(profileUrl, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Линия жизни/ }).click();
    await page.getByRole("button", { name: /Рыбалка на Немане/ }).click();
    await page.getByRole("dialog").waitFor({ timeout: 10000 });
    await page.waitForTimeout(700);
    check(new URL(page.url()).pathname === personPath, "lifeline: panel opens in place, URL unchanged");
    await shoot(page, "12-lifeline-event-panel");
    await page.fill("#title", "Рыбалка на Немане с отцом");
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
    await page.getByText("Рыбалка на Немане с отцом").first().waitFor({ timeout: 20000 });
    check(true, "lifeline: saved title shows on the profile");
    check(
      await page.evaluate(() => document.activeElement?.textContent?.includes("Рыбалка") ?? false),
      "lifeline: focus returns to the row",
    );
  } finally {
    await browser.close();
    await deleteTestAccounts(runId);
    if (errors.length) console.log("page errors:\n  " + errors.join("\n  "));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
