/**
 * One key for the masculine and feminine forms of a family name, so that
 * Козловский and his daughter Козловская read as the same family. This is
 * grammar (Russian and Polish surname gender endings), not UI text — see
 * CLAUDE.md § I18N.
 * Names without a gendered ending (Купчик, Кривуша) come back as they are.
 */
const FEMININE_ENDINGS: readonly [string, string][] = [
  ["ская", "ский"],
  ["цкая", "цкий"],
  ["ова", "ов"],
  ["ева", "ев"],
  ["ёва", "ёв"],
  ["ина", "ин"],
  ["ына", "ын"],
  ["ая", "ой"],
  ["ska", "ski"],
  ["cka", "cki"],
];

export function surnameKey(name: string | null | undefined): string | null {
  const key = name?.trim().toLocaleLowerCase();
  if (!key) return null;
  for (const [feminine, masculine] of FEMININE_ENDINGS) {
    if (key.endsWith(feminine) && key.length > feminine.length + 1) {
      return key.slice(0, -feminine.length) + masculine;
    }
  }
  return key;
}
