"use client";

import { useFamily } from "@/components/family/family-context";
import { FamilyDetailsSettings } from "@/components/family/family-details-settings";

/** Thin client wrapper — reads familyId/name/description/role from
 *  FamilyProvider (set by the family layout's requireFamilyAccess check) so
 *  the dashboard page itself can stay a plain Server Component. */
export function FamilyDashboardDetailsRow() {
  const { familyId, familyName, familyDescription, role } = useFamily();
  return (
    <FamilyDetailsSettings
      familyId={familyId}
      name={familyName}
      description={familyDescription}
      role={role}
    />
  );
}
