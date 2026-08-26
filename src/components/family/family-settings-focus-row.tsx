"use client";

import { useFamily } from "@/components/family/family-context";
import { FamilyFocusSettings } from "@/components/family/family-focus-settings";

/** Thin client wrapper — reads familyId/defaultFocusPerson from
 *  FamilyProvider (set by the family layout) so the settings page itself
 *  can stay a plain Server Component. */
export function FamilySettingsFocusRow() {
  const { familyId, defaultFocusPerson } = useFamily();
  return <FamilyFocusSettings familyId={familyId} defaultFocusPerson={defaultFocusPerson} />;
}
