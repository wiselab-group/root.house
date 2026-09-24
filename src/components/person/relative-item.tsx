import type { PartialDate } from "@/domain/shared/partial-date";
import type { RelationKind } from "@/domain/person/relation-label";

export interface RelativeItem {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  photoMediaId: string | null;
  /** Who this relative is to the profile's person — rendered through
   *  relationLabel() together with `gender` and `isCurrent`, so an
   *  optimistic partnership-status toggle re-labels «жена» ⇄ «бывшая жена»
   *  immediately, without waiting for the server round-trip. */
  relationKind: RelationKind;
  gender: "male" | "female" | "unknown";
  /** Short life span shown after the relation («1960–2011», «1988»), or null when unknown. */
  lifeSpan: string | null;
  /** Which relationship row backs this relative — undefined for derived relations (siblings), which can't be removed. */
  relationshipKind?: "parent_child" | "partnership";
  /** The relationship row's own id, for removal. Undefined for derived relations (siblings). */
  relationshipId?: string;
  /** partnership rows only — whether this marriage/union is still current (see setPartnershipStatus). */
  isCurrent?: boolean;
  /** partnership rows only — when the union started, if known (see editPartnershipStartDate). */
  startDate?: PartialDate | null;
}
