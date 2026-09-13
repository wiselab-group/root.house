export interface RelativeItem {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  /** The relationship row's own id, for removal. Undefined for derived relations (siblings). */
  relationshipId?: string;
  /** partnership rows only — whether this marriage/union is still current (see setPartnershipStatus). */
  isCurrent?: boolean;
}
