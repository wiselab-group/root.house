import type { BloodRelationLabel } from "./genealogy-algorithms";
import type { KinGender, KinshipLanguage } from "./kinship-terms";

/**
 * Russian kinship words: "троюродная сестра", "двоюродный дедушка",
 * "внучатый племянник". Every phrase is nominative — names are user data and
 * aren't declined anywhere in the app, so the UI pairs a name with a term
 * ("Анна — тётя") instead of building a sentence around it.
 */

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
function bloodKinTerm(up: number, down: number, gender: KinGender): string {
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const russianKinship: KinshipLanguage = {
  bloodKinTerm,
  spouseTerm,
  siblingPair: (degree, genderA, genderB) =>
    capitalize(
      [degreeAdjectivePlural(degree), siblingsPlural(genderA, genderB)]
        .filter(Boolean)
        .join(" "),
    ),
  pair: (termA, termB) => `${capitalize(termA)} и ${termB}`,
  inLawDetail: (label) => IN_LAW_BLOOD_LABELS[label] ?? null,
  text: {
    insufficientData: "Недостаточно данных",
    notFound: "Родство не найдено",
    notFoundDetail: "В дереве нет ни общего предка, ни связи через брак.",
    samePerson: "Один и тот же человек",
    spouses: "Супруги",
    byMarriage: "Родство через брак",
  },
};
