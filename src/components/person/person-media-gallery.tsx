import {
  getPersonGallery,
  filterVisibleGalleryPhotos,
} from "@/domain/media/media.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadForm } from "@/components/forms/photo-upload-form";
import { PhotoGrid } from "@/components/media/photo-grid";
import type { ActingMember } from "@/domain/family/permissions";

/**
 * A Person's photo gallery — server component fetching its own data (same
 * pattern as PersonFamilyPanel/PersonTimeline). Reuses PhotoGrid/PhotoLightbox
 * (the same components the family-wide gallery uses) so clicking a photo
 * here opens the same full-screen viewer — prev/next, tagged people, delete
 * — instead of just a static grid with no way to see a photo full-size.
 *
 * The avatar is a separate concept (see components/forms/avatar-editor.tsx)
 * and never appears here — this is purely the "photos of this person" grid.
 */
export async function PersonMediaGallery({
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
  /** May upload new photos — owner/editor/contributor (see
   *  domain/family/permissions.ts::canCreate). Defaults to canEdit for any
   *  caller not yet passing this explicitly. */
  canContribute?: boolean;
  member: ActingMember;
}) {
  const allPhotos = await getPersonGallery(personId, familyId);
  const photos = filterVisibleGalleryPhotos(allPhotos, member);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Фотографии</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
          <PhotoUploadForm familyId={familyId} personId={personId} />
        )}
      </CardContent>
    </Card>
  );
}
