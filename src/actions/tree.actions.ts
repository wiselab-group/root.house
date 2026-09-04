"use server";

import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  searchPeopleForPicker,
  type PersonSearchResult,
} from "@/domain/search/search.service";

/**
 * Read-only lookup used by the tree toolbar's Relationship Trace person
 * combobox (plan §16-17: "select Person A/B"). Thin wrapper around
 * search.service.ts's searchPeopleForPicker — the combobox is a client
 * component ("use client", see tree-toolbar.tsx) and can't call a domain
 * service directly, so this is the one server action bridging the two, same
 * auth-then-domain-call shape as every other action in src/actions/**.
 *
 * Unlike a typical search action, a blank `query` is valid on purpose: the
 * combobox calls this on focus (before the user types anything) to populate
 * the full family list to browse, matching searchPeopleForPicker's
 * "browse everyone, then narrow" contract.
 */
export async function searchPeopleForTraceAction(
  familyId: string,
  query: string,
): Promise<PersonSearchResult[]> {
  const session = await auth();
  if (!session?.user) return [];

  await requireFamilyAccess(familyId, session.user.id, "viewer");
  return searchPeopleForPicker(familyId, query);
}
