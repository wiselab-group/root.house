import type { PartialDate } from "@/domain/shared/partial-date";

export interface RelativeItem {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  photoMediaId: string | null;
  /** The relationship row's own id, for removal. Undefined for derived relations (siblings). */
  relationshipId?: string;
  /** partnership rows only — whether this marriage/union is still current (see setPartnershipStatus). */
  isCurrent?: boolean;
  /** partnership rows only — when the union started, if known (see editPartnershipStartDate). */
  startDate?: PartialDate | null;
}
