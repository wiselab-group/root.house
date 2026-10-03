import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI text lives in messages/*.json. Cyrillic in source code is allowed only
 * in comments and in the few domain modules that ARE a language's own
 * vocabulary (they take a `locale` parameter — see CLAUDE.md § I18N).
 */
const ALLOWED = new Set([
  "src/domain/relationship/kinship-terms.ru.ts",
  "src/domain/shared/partial-date.ts",
  "src/domain/shared/slugify.ts",
  "src/domain/person/relation-label.ts",
  "src/domain/person/display-name.ts",
  "src/domain/person/surname-key.ts",
  "src/domain/person/person.service.ts",
  "src/domain/relationship/relationship.service.ts",
  "src/domain/event/event.service.ts",
  "src/domain/media/media.service.ts",
  "src/domain/tree/layout/fixture.ts",
]);

const ROOT = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)
      ? [full]
      : [];
  });
}

/** Blanks out comments while keeping line numbers. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

describe("no hardcoded Cyrillic UI text", () => {
  it("keeps Russian strings in messages/ru.json", () => {
    const offenders = sourceFiles(path.join(ROOT, "src"))
      .map((file) => path.relative(ROOT, file))
      .filter((file) => !ALLOWED.has(file))
      .flatMap((file) =>
        stripComments(readFileSync(path.join(ROOT, file), "utf8"))
          .split("\n")
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => /[А-Яа-яЁё]/.test(line))
          .map(({ line, index }) => `${file}:${index + 1}: ${line.trim()}`),
      );
    expect(offenders).toEqual([]);
  });
});
