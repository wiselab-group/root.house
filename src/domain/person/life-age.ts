import { ageAt } from "@/domain/event/lifeline";
import type { PartialDate } from "@/domain/shared/partial-date";

/** Past this a «living» person almost certainly just has no recorded death —
 *  «(126 лет)» would read as a bug, so the age is left out instead. */
const MAX_PLAUSIBLE_LIVING_AGE = 110;

/** Below this many months the months are part of the age («1 год 4 мес.»);
 *  from two years on it's whole years only, as a family record reads. */
const MONTHS_SHOWN_BELOW = 24;

export interface LifeAge {
  years: number;
  /** Months past `years` — only for a life under two years with both dates
   *  known to the month, null otherwise (and when there are none left). */
  months: number | null;
  /** Either date was entered as approximate — shown as «~». */
  isApproximate: boolean;
}

/**
 * A person's age for a short summary: today's age while living, the age
 * they died at otherwise. A baby's age is counted in months («8 мес.»,
 * «1 год 4 мес.») when both dates carry a month. Null when it can't be told
 * honestly — no birth year, no death year for someone deceased, under a
 * year old without months to count, or an implausibly old «living» person.
 */
export function lifeAge(
  person: {
    isLiving: boolean;
    birthDate: PartialDate | null;
    deathDate: PartialDate | null;
  },
  today: Date,
): LifeAge | null {
  const { birthDate, deathDate } = person;
  const end: PartialDate | null = person.isLiving
    ? {
        year: today.getUTCFullYear(),
        month: today.getUTCMonth() + 1,
        day: today.getUTCDate(),
        precision: "exact",
        isApproximate: false,
      }
    : deathDate;

  const isApproximate = Boolean(
    birthDate?.isApproximate || (!person.isLiving && deathDate?.isApproximate),
  );
  const total = isApproximate ? null : monthsBetween(birthDate, end);
  if (total !== null && total < MONTHS_SHOWN_BELOW) {
    if (total < 1) return null;
    const months = total % 12;
    return {
      years: Math.floor(total / 12),
      months: months > 0 ? months : null,
      isApproximate,
    };
  }

  const years = ageAt(end, birthDate);
  if (years === null) return null;
  if (person.isLiving && years > MAX_PLAUSIBLE_LIVING_AGE) return null;
  return { years, months: null, isApproximate };
}

/** Whole months from birth to `at`, or null unless both carry a month. */
function monthsBetween(
  birth: PartialDate | null,
  at: PartialDate | null,
): number | null {
  if (birth?.year == null || birth.month == null) return null;
  if (at?.year == null || at.month == null) return null;
  const months = (at.year - birth.year) * 12 + (at.month - birth.month);
  const beforeDay = birth.day != null && at.day != null && at.day < birth.day;
  return beforeDay ? months - 1 : months;
}
