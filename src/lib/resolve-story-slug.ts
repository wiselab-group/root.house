import { cache } from "react";
import { notFound } from "next/navigation";
import { getStoryIdBySlug } from "@/domain/story/story.service";

/**
 * Resolves the /families/[slug]/stories/[storySlug] URL segment to a
 * storyId — same reasoning as lib/resolve-person-slug.ts. Calls notFound()
 * for an unknown slug. Does NOT check authorization or visibility — callers
 * must still call requireFamilyAccess(familyId, ...) and getVisibleStory
 * themselves.
 */
export const resolveStoryIdBySlug = cache(
  async (storySlug: string, familyId: string): Promise<string> => {
    const storyId = await getStoryIdBySlug(storySlug, familyId);
    if (!storyId) {
      notFound();
    }
    return storyId;
  },
);
