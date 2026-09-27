import type { PersonRecord } from "@/domain/person/person.repository";
import type { Locale } from "@/domain/shared/locale";
import type {
  BloodRelationLabel,
  RelationshipPathOutcome,
} from "./genealogy-algorithms";
import { russianKinship } from "./kinship-terms.ru";
import { englishKinship } from "./kinship-terms.en";

/**
 * kinship-terms.ts — the word a family would actually say for a
 * findRelationshipPath() outcome, gendered by the person it describes. The
 * domain already knows the exact shape of a blood relation (how many
 * generations up to the shared ancestor, how many down); each language
 * module (kinship-terms.ru.ts / .en.ts) turns that shape into its own
 * vocabulary — the two count degrees differently («двоюродный дедушка» vs
 * "great-uncle", «троюродная сестра» vs "second cousin").
 */

export type KinGender = PersonRecord["gender"];

/** Everything a language needs to provide; the traversal logic is shared. */
export interface KinshipLanguage {
  /** What X is to A when A climbs `up` generations to the shared ancestor and X is `down` below it. */
  bloodKinTerm(up: number, down: number, gender: KinGender): string;
  spouseTerm(gender: KinGender): string;
  /** Headline for a symmetric pair at the same generation (siblings, cousins). */
  siblingPair(degree: number, genderA: KinGender, genderB: KinGender): string;
  /** Headline for an asymmetric pair: "Тётя и племянница" / "Aunt and niece". */
  pair(termA: string, termB: string): string;
  inLawDetail(label: BloodRelationLabel): string | null;
  text: {
    insufficientData: string;
    notFound: string;
    notFoundDetail: string;
    samePerson: string;
    spouses: string;
    byMarriage: string;
  };
}

const LANGUAGES: Record<Locale, KinshipLanguage> = {
  ru: russianKinship,
  en: englishKinship,
};

export function bloodKinTerm(
  up: number,
  down: number,
  gender: KinGender,
  locale: Locale,
): string {
  return LANGUAGES[locale].bloodKinTerm(up, down, gender);
}

export interface KinshipSummary {
  /** The answer itself: "Троюродные сёстры", "Тётя и племянница", "Супруги". */
  headline: string;
  /** What each of the pair is to the other, when the relation isn't symmetric (or for spouses). */
  roles: { a: string; b: string } | null;
  /** One extra line of context, e.g. which in-law relation this is. */
  detail: string | null;
}

/**
 * The words for a whole trace: headline for the pair, plus each side's own
 * term when they differ ("Анна — тётя · Мария — племянница").
 */
export function describeKinship(
  outcome: RelationshipPathOutcome,
  genderOf: (personId: string) => KinGender,
  locale: Locale,
): KinshipSummary {
  const lang = LANGUAGES[locale];
  if (outcome.status !== "found") {
    return outcome.status === "insufficient_data"
      ? { headline: lang.text.insufficientData, roles: null, detail: null }
      : {
          headline: lang.text.notFound,
          roles: null,
          detail: lang.text.notFoundDetail,
        };
  }

  const genderA = genderOf(outcome.personAId);
  const genderB = genderOf(outcome.personBId);
  const { relationship } = outcome;

  if (relationship.label === "same person") {
    return { headline: lang.text.samePerson, roles: null, detail: null };
  }
  if (relationship.label === "spouse") {
    return {
      headline: lang.text.spouses,
      roles: { a: lang.spouseTerm(genderA), b: lang.spouseTerm(genderB) },
      detail: null,
    };
  }
  if (relationship.label === "in_law") {
    return {
      headline: lang.text.byMarriage,
      roles: null,
      detail: relationship.inLawBlood
        ? lang.inLawDetail(relationship.inLawBlood)
        : null,
    };
  }

  const up = outcome.steps.filter((s) => s.direction === "up").length;
  const down = outcome.steps.filter((s) => s.direction === "down").length;

  if (up === down) {
    return {
      headline: lang.siblingPair(up, genderA, genderB),
      roles: null,
      detail: null,
    };
  }

  const termA = lang.bloodKinTerm(down, up, genderA);
  const termB = lang.bloodKinTerm(up, down, genderB);
  return {
    headline: lang.pair(termA, termB),
    roles: { a: termA, b: termB },
    detail: null,
  };
}

export interface KinshipPathStop {
  personId: string;
  /** How the path reached this person from the previous one. Null for A. */
  via: "up" | "down" | "partner" | null;
  /**
   * Blood paths: what this person is to A ("дедушка", "двоюродный дядя").
   * Paths through a marriage: what this person is to the previous stop
   * ("жена", "сын"), since "relative to A" has no single word there.
   */
  role: string | null;
  isCommonAncestor: boolean;
}

/** One entry per person on the traced path, A first, B last. */
export function describePathStops(
  outcome: Extract<RelationshipPathOutcome, { status: "found" }>,
  genderOf: (personId: string) => KinGender,
  locale: Locale,
): KinshipPathStop[] {
  const lang = LANGUAGES[locale];
  const isBlood = outcome.steps.every((s) => s.edgeKind === "parent_child");
  const upTotal = outcome.steps.filter((s) => s.direction === "up").length;

  return outcome.personIds.map((personId, index) => {
    const isCommonAncestor = personId === outcome.commonAncestorId;
    if (index === 0) {
      return { personId, via: null, role: null, isCommonAncestor };
    }
    const step = outcome.steps[index - 1];
    const via = step.edgeKind === "partnership" ? "partner" : step.direction!;
    const gender = genderOf(personId);

    let role: string;
    if (isBlood) {
      role =
        index <= upTotal
          ? lang.bloodKinTerm(index, 0, gender)
          : lang.bloodKinTerm(upTotal, index - upTotal, gender);
    } else if (via === "partner") {
      role = lang.spouseTerm(gender);
    } else {
      role = lang.bloodKinTerm(
        via === "up" ? 1 : 0,
        via === "down" ? 1 : 0,
        gender,
      );
    }
    return { personId, via, role, isCommonAncestor };
  });
}
