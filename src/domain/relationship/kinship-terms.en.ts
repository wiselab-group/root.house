import type { BloodRelationLabel } from "./genealogy-algorithms";
import type { KinGender, KinshipLanguage } from "./kinship-terms";

/**
 * English kinship words. English counts collateral relatives differently
 * from Russian: cousins by degree plus "removed" generations ("second cousin
 * once removed"), and the parent's-sibling line by "great-" prefixes
 * ("great-uncle", "grandnephew") — no adjective of degree on uncles/nephews.
 */

interface Gendered {
  m: string;
  f: string;
  /** Gender-neutral noun when English has one (parent, cousin). */
  n?: string;
}

/** "great-" repeated, switching to an ordinal past two: "3rd great-". */
function greats(times: number): string {
  if (times <= 0) return "";
  if (times <= 2) return "great-".repeat(times);
  return `${ordinal(times)} great-`;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

const ORDINAL_WORDS: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
};

function cousinDegree(degree: number): string {
  return ORDINAL_WORDS[degree] ?? ordinal(degree);
}

function removedPhrase(removed: number): string {
  if (removed === 0) return "";
  if (removed === 1) return " once removed";
  if (removed === 2) return " twice removed";
  return ` ${removed} times removed`;
}

function ancestorNoun(generations: number): Gendered {
  if (generations === 1) return { m: "father", f: "mother", n: "parent" };
  const prefix = greats(generations - 2);
  return {
    m: `${prefix}grandfather`,
    f: `${prefix}grandmother`,
    n: `${prefix}grandparent`,
  };
}

function descendantNoun(generations: number): Gendered {
  if (generations === 1) return { m: "son", f: "daughter", n: "child" };
  const prefix = greats(generations - 2);
  return {
    m: `${prefix}grandson`,
    f: `${prefix}granddaughter`,
    n: `${prefix}grandchild`,
  };
}

function render(noun: Gendered, gender: KinGender): string {
  if (gender === "male") return noun.m;
  if (gender === "female") return noun.f;
  return noun.n ?? `${noun.m} or ${noun.f}`;
}

function bloodKinTerm(up: number, down: number, gender: KinGender): string {
  if (up === 0 && down === 0) return "";
  if (down === 0) return render(ancestorNoun(up), gender);
  if (up === 0) return render(descendantNoun(down), gender);

  if (up === 1 && down === 1) {
    return render({ m: "brother", f: "sister", n: "sibling" }, gender);
  }
  // The parent's-sibling line: uncle, great-uncle, great-great-uncle…
  if (down === 1) {
    const prefix = greats(up - 2);
    return render({ m: `${prefix}uncle`, f: `${prefix}aunt` }, gender);
  }
  // The sibling's-descendant line: nephew, grandnephew, great-grandnephew…
  if (up === 1) {
    const prefix = down === 2 ? "" : `${greats(down - 3)}grand`;
    return render({ m: `${prefix}nephew`, f: `${prefix}niece` }, gender);
  }
  const degree = Math.min(up, down) - 1;
  return `${cousinDegree(degree)} cousin${removedPhrase(Math.abs(up - down))}`;
}

function spouseTerm(gender: KinGender): string {
  if (gender === "male") return "husband";
  if (gender === "female") return "wife";
  return "spouse";
}

function siblingPair(
  degree: number,
  genderA: KinGender,
  genderB: KinGender,
): string {
  if (degree >= 2) return capitalize(`${cousinDegree(degree - 1)} cousins`);
  if (genderA === "male" && genderB === "male") return "Brothers";
  if (genderA === "female" && genderB === "female") return "Sisters";
  if (genderA === "unknown" || genderB === "unknown") return "Siblings";
  return "Brother and sister";
}

const IN_LAW_BLOOD_LABELS: Partial<Record<BloodRelationLabel, string>> = {
  parent: "Spouse's parent",
  child: "Spouse's child",
  sibling: "Spouse's sibling",
  grandparent: "Spouse's grandparent",
  grandchild: "Spouse's grandchild",
  aunt_or_uncle: "Spouse's aunt or uncle",
  niece_or_nephew: "Spouse's niece or nephew",
  cousin: "Spouse's cousin",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const englishKinship: KinshipLanguage = {
  bloodKinTerm,
  spouseTerm,
  siblingPair,
  pair: (termA, termB) => `${capitalize(termA)} and ${termB}`,
  inLawDetail: (label) => IN_LAW_BLOOD_LABELS[label] ?? null,
  text: {
    insufficientData: "Not enough data",
    notFound: "No relationship found",
    notFoundDetail:
      "The tree has neither a common ancestor nor a connection through marriage.",
    samePerson: "The same person",
    spouses: "Spouses",
    byMarriage: "Related by marriage",
  },
};
