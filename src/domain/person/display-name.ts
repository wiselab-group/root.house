import type { PersonRecord } from "./person.repository";

/**
 * Consistent human-readable name across Person cards, tree nodes, search
 * results, etc. Placeholder persons with no name at all fall back to a
 * neutral label rather than rendering blank/undefined.
 */
export function personDisplayName(
  person: Pick<PersonRecord, "firstName" | "lastName" | "nickname" | "isPlaceholder">,
): string {
  const parts = [person.firstName, person.lastName].filter(Boolean);
  if (parts.length > 0) {
    return person.nickname ? `${parts.join(" ")} (${person.nickname})` : parts.join(" ");
  }
  if (person.nickname) return person.nickname;
  return person.isPlaceholder ? "Неизвестный родственник" : "Без имени";
}
