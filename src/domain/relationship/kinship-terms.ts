import type { PersonRecord } from "@/domain/person/person.repository";
import type {
  BloodRelationLabel,
  RelationshipPathOutcome,
} from "./genealogy-algorithms";

/**
 * kinship-terms.ts — Russian kinship words for a findRelationshipPath()
 * outcome: "троюродная сестра", "двоюродный дедушка", "внучатый племянник".
 * The domain already knows the exact shape of a blood relation (how many
 * generations up to the shared ancestor, how many down); this turns that
 * shape into the word a family would actually say, gendered by the person
 * it describes.
 *
 * Every phrase is nominative, never "Мария приходится Анне …" — names are
 * user data and aren't declined anywhere in the app, so the UI pairs a name
 * with a term ("Анна — тётя") instead of building a sentence around it.
 */

export type KinGender = PersonRecord["gender"];

interface Gendered {
  m: string;
  f: string;
  /** Gender-neutral noun, when Russian has one (родитель, ребёнок). */
  n?: string;
}

const DEGREE_STEMS: Record<number, string> = {
  2: "двоюродн",
  3: "троюродн",
  4: "четвероюродн",
  5: "пятиюродн",
};

/** "двоюродный"/"двоюродная" for degree 2, nothing for degree 1 (родной). */
function degreeAdjective(degree: number): Gendered | null {
  if (degree <= 1) return null;
  const stem = DEGREE_STEMS[degree];
  if (!stem) return { m: "дальний", f: "дальняя" };
  return { m: `${stem}ый`, f: `${stem}ая` };
}

function degreeAdjectivePlural(degree: number): string {
  if (degree <= 1) return "";
  const stem = DEGREE_STEMS[degree];
  return stem ? `${stem}ые` : "дальние";
}

const pra = (times: number) => "пра".repeat(Math.max(0, times));

function ancestorNoun(generations: number): Gendered {
  if (generations === 1) return { m: "отец", f: "мать", n: "родитель" };
  const prefix = pra(generations - 2);
  return { m: `${prefix}дедушка`, f: `${prefix}бабушка` };
}

function descendantNoun(generations: number): Gendered {
  if (generations === 1) return { m: "сын", f: "дочь", n: "ребёнок" };
  const prefix = pra(generations - 2);
  return { m: `${prefix}внук`, f: `${prefix}внучка` };
}

/** Older collateral line: дядя/тётя one generation up, then дедушка/бабушка and further. */
function olderCollateralNoun(removed: number): Gendered {
  if (removed === 1) return { m: "дядя", f: "тётя" };
  return ancestorNoun(removed);
}

/** Younger collateral line: племянник, then внучатый/правнучатый племянник. */
function youngerCollateralNoun(removed: number): Gendered {
  if (removed === 1) return { m: "племянник", f: "племянница" };
  const prefix = pra(removed - 2);
  return {
    m: `${prefix}внучатый племянник`,
    f: `${prefix}внучатая племянница`,
  };
}

function render(
  adjective: Gendered | null,
  noun: Gendered,
  gender: KinGender,
): string {
  const join = (...parts: (string | undefined)[]) =>
    parts.filter(Boolean).join(" ");
  if (gender === "male") return join(adjective?.m, noun.m);
  if (gender === "female") return join(adjective?.f, noun.f);
  if (noun.n && !adjective) return noun.n;
  return `${join(adjective?.m, noun.m)} или ${noun.f}`;
}

/**
 * What person X is to person A, when the path from A climbs `up`
 * generations to their shared ancestor and then descends `down` generations
 * to X. up=3, down=3 → "троюродный брат"; up=3, down=1 → "двоюродный
 * дедушка"; up=1, down=3 → "внучатый племянник".
 *
 * Russian counts the degree differently on the two sides of a generation
 * gap: an older relative's adjective follows A's own distance minus one
 * (the brother of A's grandfather is "двоюродный дедушка", up=3), a
 * younger relative's follows A's distance as is (a grandchild of A's
 * brother is plain "внучатый племянник", up=1).
 */
export function bloodKinTerm(
  up: number,
  down: number,
  gender: KinGender,
): string {
  if (up === 0 && down === 0) return "";
  if (down === 0) return render(null, ancestorNoun(up), gender);
  if (up === 0) return render(null, descendantNoun(down), gender);

  const removed = Math.abs(up - down);
  if (removed === 0) {
    return render(degreeAdjective(up), { m: "брат", f: "сестра" }, gender);
  }
  if (down < up) {
    return render(
      degreeAdjective(up - 1),
      olderCollateralNoun(removed),
      gender,
    );
  }
  return render(degreeAdjective(up), youngerCollateralNoun(removed), gender);
}

function siblingsPlural(genderA: KinGender, genderB: KinGender): string {
  if (genderA === "male" && genderB === "male") return "братья";
  if (genderA === "female" && genderB === "female") return "сёстры";
  return "брат и сестра";
}

function spouseTerm(gender: KinGender): string {
  if (gender === "male") return "муж";
  if (gender === "female") return "жена";
  return "супруг";
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Blood-relation label on the far side of an in-law path, as a noun phrase for "… супруга". */
const IN_LAW_BLOOD_LABELS: Partial<Record<BloodRelationLabel, string>> = {
  parent: "Родитель супруга",
  child: "Ребёнок супруга",
  sibling: "Брат или сестра супруга",
  grandparent: "Бабушка или дедушка супруга",
  grandchild: "Внук или внучка супруга",
  aunt_or_uncle: "Тётя или дядя супруга",
  niece_or_nephew: "Племянник или племянница супруга",
  cousin: "Двоюродный брат или сестра супруга",
};

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
): KinshipSummary {
  if (outcome.status !== "found") {
    return outcome.status === "insufficient_data"
      ? { headline: "Недостаточно данных", roles: null, detail: null }
      : {
          headline: "Родство не найдено",
          roles: null,
          detail: "В дереве нет ни общего предка, ни связи через брак.",
        };
  }

  const genderA = genderOf(outcome.personAId);
  const genderB = genderOf(outcome.personBId);
  const { relationship } = outcome;

  if (relationship.label === "same person") {
    return { headline: "Один и тот же человек", roles: null, detail: null };
  }
  if (relationship.label === "spouse") {
    return {
      headline: "Супруги",
      roles: { a: spouseTerm(genderA), b: spouseTerm(genderB) },
      detail: null,
    };
  }
  if (relationship.label === "in_law") {
    return {
      headline: "Родство через брак",
      roles: null,
      detail: relationship.inLawBlood
        ? (IN_LAW_BLOOD_LABELS[relationship.inLawBlood] ?? null)
        : null,
    };
  }

  const up = outcome.steps.filter((s) => s.direction === "up").length;
  const down = outcome.steps.filter((s) => s.direction === "down").length;

  if (up === down) {
    const noun = siblingsPlural(genderA, genderB);
    const adjective = degreeAdjectivePlural(up);
    return {
      headline: capitalize([adjective, noun].filter(Boolean).join(" ")),
      roles: null,
      detail: null,
    };
  }

  const termA = bloodKinTerm(down, up, genderA);
  const termB = bloodKinTerm(up, down, genderB);
  return {
    headline: `${capitalize(termA)} и ${termB}`,
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
): KinshipPathStop[] {
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
          ? bloodKinTerm(index, 0, gender)
          : bloodKinTerm(upTotal, index - upTotal, gender);
    } else if (via === "partner") {
      role = spouseTerm(gender);
    } else {
      role = bloodKinTerm(via === "up" ? 1 : 0, via === "down" ? 1 : 0, gender);
    }
    return { personId, via, role, isCommonAncestor };
  });
}
