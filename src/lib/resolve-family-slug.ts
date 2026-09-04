import { cache } from "react";
import { notFound } from "next/navigation";
import { getFamilyIdBySlug } from "@/domain/family/family.service";

/**
 * Resolves the /families/[slug] URL segment to a familyId — every Server
 * Component under this route (layout.tsx AND each page.tsx) needs the id,
 * since Next.js gives each of them the raw `params` independently, not a
 * value computed by a parent layout. Wrapped in React.cache so multiple
 * calls within the same request (layout + page + nested page) share one
 * DB round-trip instead of resolving the same slug repeatedly.
 *
 * Calls notFound() for an unknown slug — a guessed/foreign slug ends up at
 * the same 404 as a guessed UUID would, never leaking whether it exists.
 * This does NOT check authorization; every caller must still follow up
 * with requireFamilyAccess(familyId, userId, minRole) before reading/writing
 * anything.
 */
export const resolveFamilyIdBySlug = cache(
  async (slug: string): Promise<string> => {
    const familyId = await getFamilyIdBySlug(slug);
    if (!familyId) {
      notFound();
    }
    return familyId;
  },
);
