#!/usr/bin/env node
// Verifies server-side story drafts (2026-09-27):
//  - «Добавить историю» creates a draft and opens the editor on it;
//  - title/text autosave to the server and follow the author to another
//    device (a second browser context with the same session);
//  - a draft is invisible to everyone else — even the family owner — in
//    the list and by direct URL; it shows only in the author's «Мои черновики»;
//  - «Опубликовать» publishes it under a slug from its title;
//  - editing a PUBLISHED story autosaves to story_drafts, the family keeps
//    reading the old text until «Сохранить», another device is offered the
//    unsaved edits, and saving clears the draft row;
//  - «Добавить историю» on a profile links the new draft to that person.
// Throwaway accounts/family only; the second member is added with SQL
// scoped to this run's family.
//
// Usage: node .claude/skills/run-photos/scripts/verify-story-drafts.mjs

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
const OUT = path.join(__dirname, "..", "screenshots", "story-drafts");
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

async function register(page, name, email) {
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "verify-test-password-123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.waitForURL(/\/families$/, { timeout: 30000 });
}

async function waitSaved(page) {
  await page
    .getByText("Черновик сохранён", { exact: true })
    .first()
    .waitFor({ timeout: 10000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const author = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  author.on("pageerror", (e) => errors.push(e.message));

  try {
    console.log("1/6 setup: author, family, person, second member (owner)");
    await register(author, "Draft Author", `draft-author-${runId}@example.test`);
    await author.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await author.fill("#name", "Проверка черновиков");
    await author.getByRole("button", { name: "Создать семью" }).click();
    await author.waitForURL(/\/families\/(?!new$)[^/]+$/, { timeout: 30000 });
    const familySlug = new URL(author.url()).pathname.split("/")[2];
    await author.goto(`${BASE_URL}/families/${familySlug}/people/new`, { waitUntil: "networkidle" });
    await author.fill("#firstName", "Виктор");
    await author.fill("#lastName", "Купчик");
    await author.getByRole("button", { name: "Добавить" }).click();
    await author.waitForURL(/\/people\/(?!new$)[^/]+$/, { timeout: 30000 });
    const profileUrl = author.url();

    const other = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    await register(other, "Other Owner", `draft-other-${runId}@example.test`);
    const [fam] = await sql`select id from families where slug=${familySlug}`;
    const [otherUser] = await sql`select id from users where email=${`draft-other-${runId}@example.test`}`;
    // Owner — the strongest role, to prove drafts beat even the owner override.
    await sql`insert into family_members (family_id, user_id, role) values (${fam.id}, ${otherUser.id}, 'owner')`;

    console.log("2/6 new story → draft → autosave");
    const storiesUrl = `${BASE_URL}/families/${familySlug}/stories`;
    await author.goto(storiesUrl, { waitUntil: "networkidle" });
    await author.getByRole("button", { name: "Добавить историю" }).click();
    await author.waitForURL(/\/stories\/[^/]+\/edit$/, { timeout: 20000 });
    const draftEditUrl = author.url();
    check(await author.getByRole("button", { name: "Опубликовать" }).isVisible(), "new story opens the editor as a draft («Опубликовать»)");
    await author.locator("#title").fill("Мост через Неман");
    await author.locator("#body").fill("Летом 1983 года папа почти не бывал дома.");
    await waitSaved(author);
    const [row] = await sql`select status, title, body from stories where family_id=${fam.id}`;
    check(row.status === "draft" && row.title === "Мост через Неман", `draft autosaved to the server (status=${row.status})`);
    await shoot(author, "01-draft-editor");

    console.log("3/6 another device, other members");
    const device2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await device2.addCookies(await author.context().cookies());
    const phone = await device2.newPage();
    await phone.goto(storiesUrl, { waitUntil: "networkidle" });
    check(await phone.getByText("Мои черновики").isVisible(), "«Мои черновики» shows the draft on another device");
    await shoot(phone, "02-phone-my-drafts");
    await phone.getByRole("link", { name: /Мост через Неман/ }).click();
    await phone.waitForURL(/\/edit$/, { timeout: 20000 });
    check((await phone.locator("#body").inputValue()).includes("1983"), "the draft's text is there on the other device");

    await other.goto(storiesUrl, { waitUntil: "networkidle" });
    check((await other.getByText("Мост через Неман").count()) === 0, "another member (owner) doesn't see the draft in the list");
    // Content, not the HTTP code: a streamed notFound() can still answer 200.
    await other.goto(draftEditUrl, { waitUntil: "networkidle" });
    await other.waitForTimeout(1500);
    const leaked =
      (await other.locator("#title").count()) +
      (await other.getByText("1983").count());
    check(leaked === 0, "…nor by its URL (no editor, no draft text)");
    await shoot(other, "02b-other-owner-direct-url");

    console.log("4/6 publish");
    await author.getByRole("button", { name: "Опубликовать" }).click();
    await author.waitForURL((url) => /\/stories\/[^/]+$/.test(url.pathname), { timeout: 20000 });
    const publishedPath = new URL(author.url()).pathname;
    check(!publishedPath.includes("story-"), `published under a slug from the title: ${publishedPath}`);
    await other.goto(storiesUrl, { waitUntil: "networkidle" });
    check(await other.getByText("Мост через Неман").first().isVisible(), "after publishing, the family sees it");
    await shoot(author, "03-published");

    console.log("5/6 editing a published story");
    await author.goto(`${BASE_URL}${publishedPath}/edit`, { waitUntil: "networkidle" });
    check(await author.getByRole("button", { name: "Сохранить" }).isVisible(), "a published story's editor says «Сохранить»");
    await author.locator("#body").click();
    await author.keyboard.press("End");
    await author.keyboard.type(" Мостотрест строил новый пролёт.");
    await waitSaved(author);
    const [pending] = await sql`select d.body from story_drafts d join stories s on s.id=d.story_id where s.family_id=${fam.id}`;
    check(pending?.body.includes("Мостотрест"), "edits autosave to story_drafts");
    await other.goto(`${BASE_URL}${publishedPath}`, { waitUntil: "networkidle" });
    check((await other.getByText("Мостотрест").count()) === 0, "the family still reads the published text meanwhile");

    await phone.goto(`${BASE_URL}${publishedPath}/edit`, { waitUntil: "networkidle" });
    await phone.getByText("Есть несохранённые правки этой истории.").waitFor({ timeout: 10000 });
    check(true, "another device is offered the unsaved edits");
    await shoot(phone, "04-phone-offered-edits");
    await phone.getByRole("button", { name: "Восстановить" }).click();
    check((await phone.locator("#body").inputValue()).includes("Мостотрест"), "restore brings the edits in");
    await phone.getByRole("button", { name: "Сохранить" }).click();
    await phone.waitForURL((url) => !url.pathname.endsWith("/edit"), { timeout: 20000 });
    const [left] = await sql`select count(*)::int as n from story_drafts d join stories s on s.id=d.story_id where s.family_id=${fam.id}`;
    check(left.n === 0, "saving clears the draft row");
    await other.goto(`${BASE_URL}${publishedPath}`, { waitUntil: "networkidle" });
    check(await other.getByText("Мостотрест", { exact: false }).first().isVisible(), "the family now reads the saved text");

    console.log("6/6 from a profile");
    await author.goto(profileUrl, { waitUntil: "networkidle" });
    await author.getByRole("tab", { name: /Истории/ }).click();
    await author.getByRole("button", { name: "Добавить историю" }).click();
    await author.waitForURL(/\/edit$/, { timeout: 20000 });
    await author.locator("#title").waitFor({ timeout: 20000 });
    const [linked] = await sql`select count(*)::int as n from story_person sp join stories s on s.id=sp.story_id where s.family_id=${fam.id} and s.status='draft'`;
    check(
      linked.n === 1 && (await author.getByText("Виктор Купчик").first().isVisible()),
      "a story started on a profile is linked to that person",
    );
    await shoot(author, "05-profile-draft");
    await author.getByRole("button", { name: "Удалить черновик" }).click();
    await author.getByRole("dialog").getByRole("button", { name: "Удалить" }).click();
    await author.waitForURL((url) => url.pathname.endsWith("/stories"), { timeout: 20000 });
    const [drafts] = await sql`select count(*)::int as n from stories where family_id=${fam.id} and status='draft'`;
    check(drafts.n === 0, "«Удалить черновик» removes it");
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
