import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * Family Home's «Пробелы в истории» — what the archive still doesn't know
 * about its people, phrased per person (not as counters) so it reads like
 * questions to ask relatives. Structure only: which person, which gap; the
 * UI words it (CLAUDE.md I18N).
 *
 * - parents: the person starts a line (has children, no parents) — the
 *   branch ends here;
 * - birthDate / birthPlace: unknown;
 * - photo: no portrait and not tagged on any photo.
 *
 * Placeholders («неизвестная мать») are skipped: they are themselves a gap
 * the tree already shows, and asking their birth date reads absurd. So is
 * a gap the family answered «Мы не знаем» (`dismissed`, gapKey).
 */
export type HistoryGapKind = "parents" | "birthDate" | "photo" | "birthPlace";

/** Also the display interleave order — a missing parent first: the one
 *  gap that hides whole generations, not a single fact. */
export const HISTORY_GAP_KINDS = [
  "parents",
  "birthDate",
  "photo",
  "birthPlace",
] as const satisfies readonly HistoryGapKind[];

export function isHistoryGapKind(value: unknown): value is HistoryGapKind {
  return (HISTORY_GAP_KINDS as readonly unknown[]).includes(value);
}

/** One gap's identity — how a «Мы не знаем» is stored and matched. */
export function gapKey(personId: string, kind: HistoryGapKind): string {
  return `${personId}:${kind}`;
}

export interface HistoryGap {
  kind: HistoryGapKind;
  personId: string;
}

export interface GapPerson {
  id: string;
  isPlaceholder: boolean;
  birthDate: PartialDate | null;
  birthPlaceId: string | null;
  photoMediaId: string | null;
}

/**
 * Every gap, ordered for display: kinds interleaved so the first few rows
 * aren't all «когда родился?», each person's first gap ahead of anyone's
 * second, and every kind's list rotated by `day` so Family Home asks about
 * different people on different days while staying stable within one.
 */
export function findHistoryGaps(
  people: readonly GapPerson[],
  parentChildEdges: readonly { parentId: string; childId: string }[],
  photographedIds: ReadonlySet<string>,
  dismissed: ReadonlySet<string>,
  day: number,
): HistoryGap[] {
  const hasParent = new Set(parentChildEdges.map((e) => e.childId));
  const hasChild = new Set(parentChildEdges.map((e) => e.parentId));
  const known = people
    .filter((p) => !p.isPlaceholder)
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const missing: Record<HistoryGapKind, (p: GapPerson) => boolean> = {
    parents: (p) => hasChild.has(p.id) && !hasParent.has(p.id),
    birthDate: (p) => !p.birthDate,
    photo: (p) => !p.photoMediaId && !photographedIds.has(p.id),
    birthPlace: (p) => !p.birthPlaceId,
  };
  const byKind = HISTORY_GAP_KINDS.map((kind) =>
    rotate(
      known
        .filter((p) => missing[kind](p) && !dismissed.has(gapKey(p.id, kind)))
        .map((p) => ({ kind, personId: p.id })),
      day,
    ),
  );

  const interleaved: HistoryGap[] = [];
  const longest = Math.max(0, ...byKind.map((list) => list.length));
  for (let i = 0; i < longest; i++) {
    for (const list of byKind) if (i < list.length) interleaved.push(list[i]);
  }

  const seen = new Set<string>();
  const firsts: HistoryGap[] = [];
  const repeats: HistoryGap[] = [];
  for (const gap of interleaved) {
    (seen.has(gap.personId) ? repeats : firsts).push(gap);
    seen.add(gap.personId);
  }
  return [...firsts, ...repeats];
}

function rotate<T>(list: T[], by: number): T[] {
  if (list.length === 0) return list;
  const offset = ((by % list.length) + list.length) % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)];
}
