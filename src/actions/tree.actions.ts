"use server";

import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { searchPeople, type PersonSearchResult } from "@/domain/search/search.service";

/**
 * Read-only search used by the tree toolbar's person-picker dialog (plan
 * §16-17: Search + Relationship Trace's "select Person A/B"). Thin wrapper
 * around the existing search.service.ts — the dialog is a client component
 * ("use client", see tree-toolbar.tsx) and can't call a domain service
 * directly, so this is the one server action bridging the two, same
 * auth-then-domain-call shape as every other action in src/actions/**.
 */
export async function searchPeopleForTraceAction(
  familyId: string,
  query: string,
): Promise<PersonSearchResult[]> {
  const session = await auth();
  if (!session?.user) return [];

  await requireFamilyAccess(familyId, session.user.id, "viewer");
  if (query.trim().length === 0) return [];
  return searchPeople(familyId, query);
}
