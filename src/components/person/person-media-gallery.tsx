import { PersonPhotoUploadPanel } from "@/components/media/person-photo-upload-panel";
import { PhotoGrid } from "@/components/media/photo-grid";
import { ProfileSection } from "./profile-section";
import type { GalleryPhotoView } from "@/components/media/gallery-photo";

/**
 * A Person's photo gallery — `photos` is fetched once in page.tsx (shared
 * with PersonProfileHero, which needs the same list for its hero image) and
 * passed down here rather than this component querying getPersonGallery
 * itself, avoiding a duplicate round-trip for one page load. Reuses
 * PhotoGrid/PhotoLightbox (the same components the family-wide gallery uses)
 * so clicking a photo here opens the same full-screen viewer — prev/next,
 * tagged people, delete — instead of just a static grid with no way to see a
 * photo full-size.
 *
 * The portrait is one of these photos: each tile's menu can make it the
 * portrait («Сделать портретом»), and an uploaded portrait lands here too
 * (see media.service.ts::uploadPersonAvatar).
 */
export function PersonMediaGallery({
  familyId,
  familySlug,
  personId,
  canEdit,
  canContribute = canEdit,
  photos,
  portraitMediaId,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  canEdit: boolean;
  /** May upload new photos — owner/editor/contributor (see
   *  domain/family/permissions.ts::canCreate). Defaults to canEdit for any
   *  caller not yet passing this explicitly. */
  canContribute?: boolean;
  photos: GalleryPhotoView[];
  /** The Person's current portrait (photoMediaId) — marked in the menu. */
  portraitMediaId: string | null;
}) {
  return (
    <ProfileSection title="Фотографии" count={photos.length}>
      <div className="flex flex-col gap-4">
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Фотографий пока нет.</p>
        ) : (
          <PhotoGrid
            photos={photos}
            familyId={familyId}
            familySlug={familySlug}
            canEdit={canEdit}
            portrait={{ personId, mediaId: portraitMediaId }}
          />
        )}

        {canContribute && (
          <PersonPhotoUploadPanel familyId={familyId} personId={personId} />
        )}
      </div>
    </ProfileSection>
  );
}
