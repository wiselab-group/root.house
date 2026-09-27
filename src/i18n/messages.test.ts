import { describe, expect, it } from "vitest";
import ru from "../../messages/ru.json";
import en from "../../messages/en.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const ruKeys = flatten(ru);
const enKeys = flatten(en);

describe("messages", () => {
  it("en.json has exactly the keys of ru.json", () => {
    const missingInEn = [...ruKeys.keys()].filter((k) => !enKeys.has(k));
    const extraInEn = [...enKeys.keys()].filter((k) => !ruKeys.has(k));
    expect({ missingInEn, extraInEn }).toEqual({
      missingInEn: [],
      extraInEn: [],
    });
  });

  it("has no empty translations", () => {
    const empty = [...ruKeys, ...enKeys]
      .filter(([, value]) => value.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("en.json contains no Cyrillic outside the language names", () => {
    const cyrillic = [...enKeys]
      .filter(([key, value]) => key !== "locale.ru" && /[А-Яа-яЁё]/.test(value))
      .map(([key]) => key);
    expect(cyrillic).toEqual([]);
  });
});
