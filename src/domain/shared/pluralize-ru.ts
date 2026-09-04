/**
 * Russian plural declension for count-dependent nouns (1 человек / 2 человека
 * / 5 человек). Pure — no framework deps, per CLAUDE.md domain rules.
 */
export function pluralizeRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** "1 человек" / "2 человека" / "5 человек". */
export function personCountLabel(count: number): string {
  return `${count} ${pluralizeRu(count, "человек", "человека", "человек")}`;
}
