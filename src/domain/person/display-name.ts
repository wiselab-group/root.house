import type { PersonRecord } from "./person.repository";

/**
 * Consistent human-readable name across Person cards, tree nodes, search
 * results, etc. Placeholder persons with no name at all fall back to a
 * neutral label rather than rendering blank/undefined.
 */
export function personDisplayName(
  person: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder"
  >,
): string {
  const parts = [person.firstName, person.lastName].filter(Boolean);
  if (parts.length > 0) {
    return person.nickname
      ? `${parts.join(" ")} (${person.nickname})`
      : parts.join(" ");
  }
  if (person.nickname) return person.nickname;
  return person.isPlaceholder ? "Неизвестный родственник" : "Без имени";
}

/**
 * 1-2 letter initials for the avatar fallback (shown while no photo is set,
 * or while one is loading) — first letter of first+last name, or just the
 * nickname's first letter, or "?" for a fully blank placeholder.
 */
export function personInitials(
  person: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder"
  >,
): string {
  const first = person.firstName?.trim()?.[0];
  const last = person.lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (person.nickname?.trim()?.[0])
    return person.nickname.trim()[0].toUpperCase();
  return "?";
}
