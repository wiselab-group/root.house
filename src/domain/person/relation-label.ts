import type { PartialDate } from "@/domain/shared/partial-date";
import type { Locale } from "@/domain/shared/locale";

export type RelationKind = "parent" | "spouse" | "child" | "sibling";
type Gender = "male" | "female" | "unknown";

const LABELS: Record<Locale, Record<RelationKind, Record<Gender, string>>> = {
  ru: {
    parent: { male: "отец", female: "мать", unknown: "родитель" },
    spouse: { male: "муж", female: "жена", unknown: "супруг(а)" },
    child: { male: "сын", female: "дочь", unknown: "ребёнок" },
    sibling: { male: "брат", female: "сестра", unknown: "брат или сестра" },
  },
  en: {
    parent: { male: "father", female: "mother", unknown: "parent" },
    spouse: { male: "husband", female: "wife", unknown: "spouse" },
    child: { male: "son", female: "daughter", unknown: "child" },
    sibling: { male: "brother", female: "sister", unknown: "sibling" },
  },
};

const FORMER: Record<Locale, Record<Gender, string>> = {
  ru: {
    male: "бывший муж",
    female: "бывшая жена",
    unknown: "бывший супруг(а)",
  },
  en: { male: "ex-husband", female: "ex-wife", unknown: "former spouse" },
};

/**
 * Who a relative is to the profile's person, in the relative's own grammatical
 * gender — «мать», not «родитель» — for the Person Profile's plain family
 * list (avatar / name / relation). A partnership that is no longer current
 * reads «бывшая жена» instead of a separate «бывш.» badge.
 */
export function relationLabel(
  kind: RelationKind,
  gender: Gender,
  isCurrentPartnership: boolean,
  locale: Locale,
): string {
  if (kind === "spouse" && !isCurrentPartnership) return FORMER[locale][gender];
  return LABELS[locale][kind][gender];
}

/**
 * Compact year span for list rows: «1899–1964», just «1988» for the living,
 * «ум. 2011» / "d. 2011" when only the death year is known, null when
 * nothing is.
 */
export function shortLifeSpan(
  person: {
    isLiving: boolean;
    birthDate: PartialDate | null;
    deathDate: PartialDate | null;
  },
  locale: Locale,
): string | null {
  const birth = person.birthDate?.year ?? null;
  const death = person.deathDate?.year ?? null;
  if (person.isLiving) return birth ? String(birth) : null;
  if (birth && death) return `${birth}–${death}`;
  if (birth) return `${birth}–?`;
  if (death) return locale === "ru" ? `ум. ${death}` : `d. ${death}`;
  return null;
}
