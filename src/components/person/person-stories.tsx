import { getTranslations } from "next-intl/server";
import {
  getPersonStories,
  filterVisibleStories,
} from "@/domain/story/story.service";
import { getVisibleStoryPhotos } from "@/domain/media/media.service";
import { NewStoryButton } from "@/components/story/new-story-button";
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
  const t = await getTranslations("profile");
  const allStories = await getPersonStories(personId, familyId);
  const stories = filterVisibleStories(allStories, member);
  // Each story's cover is the first slide of its own hero carousel — the
  // first attached photo this member may see. None → a text-only card.
  const covers = await Promise.all(
    stories.map(
      async (story) =>
        (await getVisibleStoryPhotos(story.id, familyId, member))[0]?.id ??
        null,
    ),
  );

  return (
    <ProfileSectionWithAdd
      title={t("tabStories")}
      count={stories.length}
      addLabel={t("addStory")}
      // «Добавить историю» opens the full-page editor on a new draft linked
      // to this person, not an inline form — see NewStoryButton.
      extraAction={
        canContribute && (
          <NewStoryButton
            familyId={familyId}
            personId={personId}
            variant="section"
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {stories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noStories")}</p>
        ) : (
          <PersonStoriesList
            familyId={familyId}
            familySlug={familySlug}
            personId={personId}
            stories={stories.map((story, index) => ({
              ...story,
              coverMediaId: covers[index] ?? null,
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
