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
 * The avatar is a separate concept (see components/forms/avatar-editor.tsx)
 * and never appears here — this is purely the "photos of this person" grid.
 */
export function PersonMediaGallery({
  familyId,
  familySlug,
  personId,
  canEdit,
  canContribute = canEdit,
  photos,
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
}) {
  return (
    <ProfileSection id="photos" title="Фотографии" count={photos.length}>
      <div className="flex flex-col gap-4">
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Фотографий пока нет.</p>
        ) : (
          <PhotoGrid
            photos={photos}
            familyId={familyId}
            familySlug={familySlug}
            canEdit={canEdit}
          />
        )}

        {canContribute && (
          <PersonPhotoUploadPanel familyId={familyId} personId={personId} />
        )}
      </div>
    </ProfileSection>
  );
}
