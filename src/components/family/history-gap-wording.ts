import { useLocale, useTranslations } from "next-intl";
import { personDisplayName } from "@/domain/person/display-name";
import type { HistoryGapKind } from "@/domain/family/history-gaps";
import type { PersonRecord } from "@/domain/person/person.repository";

export type GapRowPerson = Pick<
  PersonRecord,
  | "id"
  | "slug"
  | "firstName"
  | "lastName"
  | "nickname"
  | "isPlaceholder"
  | "photoMediaId"
  | "gender"
>;

export interface HistoryGapItem {
  kind: HistoryGapKind;
  person: GapRowPerson;
}

const QUESTION_KEY = {
  parents: "gapParents",
  birthDate: "gapBirthDate",
  birthPlace: "gapBirthPlace",
  photo: "gapPhoto",
} as const satisfies Record<HistoryGapKind, string>;

/** Where each gap gets filled: the profile's Семья (add a parent) or Фото
 *  tab, or the edit panel for the birth facts. */
function gapHref(kind: HistoryGapKind, profile: string): string {
  if (kind === "parents") return `${profile}#family`;
  if (kind === "photo") return `${profile}#photos`;
  return `${profile}/edit`;
}

/** A gap as the page says it: whose, the question, where to answer. */
export function useGapWording({ kind, person }: HistoryGapItem, slug: string) {
  const t = useTranslations("familyHome");
  const locale = useLocale();
  return {
    name: personDisplayName(person, locale),
    question: t(QUESTION_KEY[kind], { gender: person.gender }),
    href: gapHref(kind, `/families/${slug}/people/${person.slug}`),
  };
}
