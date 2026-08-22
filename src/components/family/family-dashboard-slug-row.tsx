"use client";

import { useFamily } from "@/components/family/family-context";
import { FamilySlugSettings } from "@/components/family/family-slug-settings";

/** Thin client wrapper — reads familyId/slug/role from FamilyProvider (set
 *  by the family layout's requireFamilyAccess check) so the dashboard page
 *  itself can stay a plain Server Component. */
export function FamilyDashboardSlugRow() {
  const { familyId, familySlug, role } = useFamily();
  return <FamilySlugSettings familyId={familyId} slug={familySlug} role={role} />;
}
