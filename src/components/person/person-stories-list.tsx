"use client";

import { useOptimistic } from "react";
import { DeleteStoryButton } from "@/components/forms/delete-story-button";
import { StoryBody } from "./story-body";
import { PrivacyBadge } from "./privacy-badge";
import type { StoryRecord } from "@/domain/story/story.service";

/**
 * Renders PersonStories' already-filtered, already-permission-checked story
 * list — split out purely so it can hold client state (useOptimistic)
 * while PersonStories itself stays a server component doing the fetch.
 * Deletion is optimistic: DeleteStoryButton calls onDeleted inside its own
 * startTransition, so the story disappears immediately on confirm instead
 * of waiting for deleteStoryAction's revalidatePath round-trip.
 */
export function PersonStoriesList({
  familyId,
  personId,
  stories,
}: {
  familyId: string;
  personId: string;
  stories: (StoryRecord & { canDelete: boolean })[];
}) {
  const [optimisticStories, removeOptimisticStory] = useOptimistic(
    stories,
    (state, deletedStoryId: string) =>
      state.filter((story) => story.id !== deletedStoryId),
  );

  return (
    <ul className="flex flex-col gap-4">
      {optimisticStories.map((story) => (
        <li
          key={story.id}
          className="border-b border-border pb-4 last:border-0 last:pb-0"
        >
          <h3 className="flex items-center gap-1.5 font-medium">
            {story.title}
            <PrivacyBadge privacyLevel={story.privacyLevel} compact />
          </h3>
          <StoryBody body={story.body} />
          {story.canDelete && (
            <div className="mt-1">
              <DeleteStoryButton
                familyId={familyId}
                personId={personId}
                storyId={story.id}
                onDeleted={() => removeOptimisticStory(story.id)}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
