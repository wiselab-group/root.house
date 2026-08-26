"use client";

import { useFamily } from "@/components/family/family-context";
import { FamilyDeleteSettings } from "@/components/family/family-delete-settings";

/** Thin client wrapper — reads familyId/familyName/role from FamilyProvider
 *  (set by the family layout's requireFamilyAccess check) so the settings
 *  page itself can stay a plain Server Component. Renders nothing for a
 *  non-owner — deletion is also re-checked server-side in
 *  deleteFamilyAction regardless. */
export function FamilySettingsDeleteRow() {
  const { familyId, familyName, role } = useFamily();
  if (role !== "owner") return null;
  return <FamilyDeleteSettings familyId={familyId} familyName={familyName} />;
}
