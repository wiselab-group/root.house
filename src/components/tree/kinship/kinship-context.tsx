"use client";

import { createContext, useContext } from "react";

/**
 * What a person card needs from the Relationship Trace panel, without
 * threading more callbacks through toReactFlow's node data:
 *
 * - `isPicking` — the panel is open with an empty slot. A card click then
 *   fills that slot instead of opening the card's own popover, so the
 *   second person can be chosen straight on the tree.
 *
 * Null outside TreeToolbar (the read-only Share Link tree), where neither
 * exists.
 */
export interface KinshipContextValue {
  isPicking: boolean;
  pick: (personId: string) => void;
}

const KinshipContext = createContext<KinshipContextValue | null>(null);

export const KinshipProvider = KinshipContext.Provider;

export function useKinshipContext(): KinshipContextValue | null {
  return useContext(KinshipContext);
}
