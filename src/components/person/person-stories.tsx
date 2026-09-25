import {
  getPersonStories,
  filterVisibleStories,
} from "@/domain/story/story.service";
import { AddStoryForm } from "@/components/forms/add-story-form";
import { PersonStoriesList } from "./person-stories-list";
import { ProfileSectionWithAdd } from "./profile-section-with-add";
import { canDelete, type ActingMember } from "@/domain/family/permissions";

/**
 * A Person's family stories/memories — server component, same pattern as
 * PersonFamilyPanel/PersonTimeline/PersonMediaGallery.
 */
export async function PersonStories({
  familyId,
  familySlug,
  personId,
  canEdit,
  canContribute = canEdit,
  member,
}: {
  familyId: string;
  familySlug: string;
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
    <ProfileSectionWithAdd
      title="Истории"
      count={stories.length}
      addLabel="Добавить историю"
      form={
        canContribute && (
          <AddStoryForm familyId={familyId} personId={personId} />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {stories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Историй пока нет.</p>
        ) : (
          <PersonStoriesList
            familyId={familyId}
            familySlug={familySlug}
            personId={personId}
            stories={stories.map((story) => ({
              ...story,
              canDelete: canDelete(member, {
                privacyLevel: story.privacyLevel,
                createdBy: story.authorId,
              }),
            }))}
          />
        )}
      </div>
    </ProfileSectionWithAdd>
  );
}
