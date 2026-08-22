import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * A known death date means the person is, definitionally, not living —
 * isLiving is otherwise an explicit flag (never derived from deathDate, per
 * CLAUDE.md) precisely because "no death date recorded" must not be read as
 * "confirmed alive". But the reverse direction — a death date IS on record —
 * is unambiguous, so a caller sending isLiving:true alongside a dated death
 * is a stale/contradictory form value, not a legitimate fact to persist.
 * Reconciled here (not rejected as a validation error) so the UI in
 * PersonForm that already unchecks "Жив(а)" client-side has a server-side
 * backstop, without forcing every caller to repeat this check.
 *
 * A cleared death year does NOT flip isLiving back to true — that direction
 * is ambiguous (the year could've been cleared by mistake mid-edit) and is
 * left to the user's explicit checkbox choice.
 */
export function reconcileLivingStatus<
  T extends { isLiving?: boolean; deathDate?: PartialDate | null },
>(input: T): T {
  if (input.isLiving && input.deathDate?.year != null) {
    return { ...input, isLiving: false };
  }
  return input;
}
