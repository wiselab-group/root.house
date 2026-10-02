#!/usr/bin/env node
// Reproduces editing from the profile's Линия жизни card: a dated real
// event («Переезд в Эстонию» → «Редактировать» opens the EditPanel) and the
// synthetic «Свадьба» row (→ «Редактировать» must lead somewhere the
// marriage can actually be edited). Throwaway account + family; relatives,
// partnership and event are inserted with SQL scoped to this run's family.
//
// Usage: node .claude/skills/run-photos/scripts/verify-lifeline-edit.mjs

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
const OUT = path.join(__dirname, "..", "screenshots", "lifeline-edit");
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

/** Selects a lifeline dot by its event title and returns the card. */
async function selectOnLifeline(page, title) {
  await page.getByRole("tab", { name: /Линия жизни/ }).click();
  const marker = page.getByRole("button", { name: new RegExp(title) }).first();
  // The marker button itself is w-0 (its dot/label overflow it), which
  // Playwright reads as "not visible" — force the click.
  await marker.dispatchEvent("click");
  await page.waitForTimeout(500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });

  try {
    console.log("1/3 setup");
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    await page.fill("#name", "Lifeline Edit Verifier");
    await page.fill("#email", `lifeline-edit-${runId}@example.test`);
    await page.fill("#password", "verify-test-password-123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.waitForURL(/\/families$/, { timeout: 30000 });
    await page.goto(`${BASE_URL}/families/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "Проверка линии жизни");
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

    const [fam] = await sql`select id from families where slug=${familySlug}`;
    const [alex] = await sql`select id, created_by from persons where family_id=${fam.id} and slug=${personSlug}`;
    await sql`update persons set gender='male', birth_date_year=1988, birth_date_precision='year_only' where id=${alex.id}`;
    const [ele] = await sql`insert into persons (family_id, slug, first_name, last_name, gender, birth_date_year, birth_date_precision, created_by)
      values (${fam.id}, ${"elenora-" + runId}, 'Элеонора', 'Купчик', 'female', 1990, 'year_only', ${alex.created_by}) returning id`;
    await sql`insert into relationships_partnership (family_id, person1_id, person2_id, is_current, start_date_year, start_date_precision)
      values (${fam.id}, ${alex.id}, ${ele.id}, true, 2012, 'year_only')`;
    const [ev] = await sql`insert into events (family_id, type, title, date_year, date_precision, created_by)
      values (${fam.id}, 'migration', 'Переезд в Эстонию', 2021, 'year_only', ${alex.created_by}) returning id`;
    await sql`insert into event_participants (event_id, person_id, role) values (${ev.id}, ${alex.id}, 'subject')`;

    console.log("2/3 real event from the lifeline card");
    await page.goto(profileUrl, { waitUntil: "networkidle" });
    await selectOnLifeline(page, "Переезд в Эстонию");
    await shoot(page, "01-event-selected");
    await page.getByRole("button", { name: "Редактировать" }).first().click();
    const opened = await page
      .getByRole("dialog")
      .waitFor({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(700);
    check(opened, "«Редактировать» on the event card opens the panel");
    await shoot(page, "02-event-edit");
    if (opened) await page.keyboard.press("Escape");

    console.log("3/3 synthetic «Свадьба»");
    await page.goto(profileUrl, { waitUntil: "networkidle" });
    await selectOnLifeline(page, "Свадьба");
    await shoot(page, "03-marriage-selected");
    await page.getByRole("button", { name: "Редактировать" }).first().click();
    const marriageOpened = await page
      .getByRole("dialog")
      .waitFor({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(700);
    check(marriageOpened, "«Редактировать» on «Свадьба» opens the panel");
    await shoot(page, "04-marriage-panel");
    await page.fill("#startDateYear", "2013");
    check((await page.locator("#endDateYear").count()) === 0, "no divorce date while the marriage is ongoing");
    await page.getByRole("switch", { name: "Брак продолжается" }).click();
    await page.locator("#endDateYear").waitFor({ timeout: 5000 });
    check(await page.getByText("Дата развода").isVisible(), "switching off reveals «Дата развода»");
    await page.fill("#endDateYear", "2010");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Сохранить" }).click();
    await dialog.getByText("Брак не может завершиться раньше свадьбы").waitFor({ timeout: 10000 });
    check(true, "divorce before the wedding is rejected");
    await page.fill("#endDateYear", "2019");
    await shoot(page, "04b-marriage-divorce-date");
    await dialog.getByRole("button", { name: "Сохранить" }).click();
    await dialog.waitFor({ state: "detached", timeout: 20000 });
    const [saved] = await sql`select start_date_year, end_date_year, is_current, status from relationships_partnership where person1_id=${alex.id}`;
    check(
      saved.start_date_year === 2013 && saved.end_date_year === 2019 && saved.is_current === false && saved.status === "divorced",
      `marriage saved: ${saved.start_date_year}–${saved.end_date_year} current=${saved.is_current} status=${saved.status}`,
    );
    await page.waitForTimeout(800);
    await shoot(page, "05-marriage-after-save");

    await page.getByRole("button", { name: "Редактировать" }).first().click();
    await page.locator("#endDateYear").waitFor({ timeout: 8000 });
    check((await page.locator("#endDateYear").inputValue()) === "2019", "reopened panel shows the saved divorce year");
    await page.getByRole("switch", { name: "Брак продолжается" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
    const [again] = await sql`select end_date_year, is_current from relationships_partnership where person1_id=${alex.id}`;
    check(again.end_date_year === null && again.is_current === true, "switching back on clears the divorce date");
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
