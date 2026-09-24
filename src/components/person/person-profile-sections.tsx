import type { PersonRecord } from "@/domain/person/person.service";
import type { ActingMember } from "@/domain/family/permissions";
import type { GalleryPhotoView } from "@/components/media/gallery-photo";
import { PersonProfileIntro } from "./person-profile-intro";
import { PersonFamilyPanel } from "./person-family-panel";
import { PersonStories } from "./person-stories";
import { PersonMediaGallery } from "./person-media-gallery";
import { PersonTimeline } from "./person-timeline";
import { PersonDocuments } from "./person-documents";
import { ProfileTabs } from "./profile-tabs";

/** Each tab's content column; the first section in a panel drops its own
 *  top border — the tab bar above already separates it from the hero. */
const PANEL =
  "mx-auto flex max-w-3xl flex-col gap-14 px-4 pt-10 pb-20 sm:px-8 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0";

/**
 * Everything under the Person Profile hero, grouped into the tabs the user
 * asked for (Обзор / Истории / Линия жизни / Фото / Документы — tabs on
 * desktop, one long scroll with «Содержание» on phones, see ProfileTabs).
 * «Обзор» holds the description, the facts strip and the family list; the
 * other tabs are the existing section components unchanged.
 */
export function PersonProfileSections({
  person,
  familyId,
  familySlug,
  birthPlaceName,
  deathPlaceName,
  counts,
  photos,
  viewer,
  canEdit,
  canContribute,
}: {
  person: PersonRecord;
  familyId: string;
  familySlug: string;
  birthPlaceName: string | null;
  deathPlaceName: string | null;
  counts: { stories: number; events: number; documents: number };
  photos: GalleryPhotoView[];
  viewer: ActingMember;
  canEdit: boolean;
  canContribute: boolean;
}) {
  const personId = person.id;
  const shared = { familyId, familySlug, personId };

  return (
    <ProfileTabs
      panels={[
        {
          id: "overview",
          label: "Обзор",
          content: (
            <div className={PANEL}>
              <PersonProfileIntro
                description={person.description}
                facts={[
                  { label: "Девичья фамилия", value: person.maidenName },
                  { label: "Прозвище", value: person.nickname },
                  { label: "Место рождения", value: birthPlaceName },
                  { label: "Место смерти", value: deathPlaceName },
                  { label: "Причина смерти", value: person.deathCause },
                  { label: "Национальность", value: person.nationality },
                  { label: "Религия", value: person.religion },
                ]}
              />
              <PersonFamilyPanel {...shared} canEdit={canEdit} />
            </div>
          ),
        },
        {
          id: "stories",
          label: "Истории",
          count: counts.stories,
          content: (
            <div className={PANEL}>
              <PersonStories
                {...shared}
                canEdit={canEdit}
                canContribute={canContribute}
                member={viewer}
              />
            </div>
          ),
        },
        {
          id: "timeline",
          label: "Линия жизни",
          count: counts.events,
          content: (
            <div className={PANEL}>
              <PersonTimeline
                {...shared}
                lifelinePerson={person}
                canEdit={canEdit}
                canContribute={canContribute}
                member={viewer}
              />
            </div>
          ),
        },
        {
          id: "photos",
          label: "Фото",
          count: photos.length,
          content: (
            <div className={PANEL}>
              <PersonMediaGallery
                {...shared}
                canEdit={canEdit}
                canContribute={canContribute}
                photos={photos}
                portraitMediaId={person.photoMediaId}
              />
            </div>
          ),
        },
        {
          id: "documents",
          label: "Документы",
          count: counts.documents,
          content: (
            <div className={PANEL}>
              <PersonDocuments
                {...shared}
                canContribute={canContribute}
                member={viewer}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
