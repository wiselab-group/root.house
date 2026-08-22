import { cache } from "react";
import { notFound } from "next/navigation";
import { getPersonIdBySlug } from "@/domain/person/person.service";

/**
 * Resolves the /families/[slug]/people/[personSlug] URL segment to a
 * personId — same reasoning as lib/resolve-family-slug.ts: every Server
 * Component under this route needs the id, params come to each of them
 * independently, and React.cache collapses repeat calls within one render.
 *
 * Calls notFound() for an unknown slug. Does NOT check authorization —
 * callers must still call requireFamilyAccess(familyId, ...) themselves
 * (this only resolves the person's slug scoped to a family already known
 * to be valid; it never substitutes for the family-level access check).
 */
export const resolvePersonIdBySlug = cache(
  async (personSlug: string, familyId: string): Promise<string> => {
    const personId = await getPersonIdBySlug(personSlug, familyId);
    if (!personId) {
      notFound();
    }
    return personId;
  },
);
