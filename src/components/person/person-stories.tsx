import {
  getPersonStories,
  filterVisibleStories,
} from "@/domain/story/story.service";
import { AddStoryForm } from "@/components/forms/add-story-form";
import { DeleteStoryButton } from "@/components/forms/delete-story-button";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { ProfileSection } from "./profile-section";
import { canDelete, type ActingMember } from "@/domain/family/permissions";

/**
 * A Person's family stories/memories — server component, same pattern as
 * PersonFamilyPanel/PersonTimeline/PersonMediaGallery.
 */
export async function PersonStories({
  familyId,
  personId,
  canEdit,
  canContribute = canEdit,
  member,
}: {
  familyId: string;
  personId: string;
  canEdit: boolean;
  /** May add Stories — owner/editor/contributor. Defaults to canEdit for
   *  any caller not yet passing this explicitly. */
  canContribute?: boolean;
  member: ActingMember;
}) {
  const allStories = await getPersonStories(personId, familyId);
  const stories = filterVisibleStories(allStories, member);

  return (
    <ProfileSection title="Истории">
      <div className="flex flex-col gap-4">
        {stories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Историй пока нет.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {stories.map((story) => (
              <li
                key={story.id}
                className="border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <h3 className="font-medium">{story.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {story.body}
                </p>
                {canDelete(member, {
                  privacyLevel: story.privacyLevel,
                  createdBy: story.authorId,
                }) && (
                  <div className="mt-1">
                    <DeleteStoryButton
                      familyId={familyId}
                      personId={personId}
                      storyId={story.id}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canContribute && (
          <CollapsibleForm triggerLabel="Добавить историю">
            <AddStoryForm familyId={familyId} personId={personId} />
          </CollapsibleForm>
        )}
      </div>
    </ProfileSection>
  );
}
