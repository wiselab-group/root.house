import { findHistoryGaps } from "@/domain/family/history-gaps";
import type { GalleryPhoto } from "@/domain/media/media.service";
import type { PersonRecord } from "@/domain/person/person.repository";
import type { HistoryGapItem } from "./history-gap-wording";

/** «Пробелы в истории» shows 1 + 2, then 4 more per «Ещё N вопросов» — past this many
 *  it's a cataloguing job, not a home-page prompt. */
const HISTORY_GAPS_LIMIT = 40;
const DAY_MS = 86_400_000;

/**
 * Family Home's gap rows, server side: `people` and `photos` already
 * filtered to what the viewer may see. Each row carries only the fields
 * the row draws, never the whole PersonRecord (notes, dates) to the client.
 */
export function buildHistoryGapItems(
  people: PersonRecord[],
  photos: GalleryPhoto[],
  parentChildEdges: { parentId: string; childId: string }[],
  dismissed: ReadonlySet<string>,
): HistoryGapItem[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const photographed = new Set(
    photos.flatMap((photo) => photo.people.map((tagged) => tagged.id)),
  );
  return findHistoryGaps(
    people,
    parentChildEdges,
    photographed,
    dismissed,
    Math.floor(Date.now() / DAY_MS),
  )
    .slice(0, HISTORY_GAPS_LIMIT)
    .flatMap(({ kind, personId }) => {
      const p = byId.get(personId);
      if (!p) return [];
      const { id, slug, firstName, lastName, nickname } = p;
      const { isPlaceholder, photoMediaId, gender } = p;
      const person = { id, slug, firstName, lastName, nickname };
      return [
        { kind, person: { ...person, isPlaceholder, photoMediaId, gender } },
      ];
    });
}
