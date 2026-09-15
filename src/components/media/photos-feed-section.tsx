import { PhotoGrid } from "./photo-grid";
import { EmptyPhotosState } from "./empty-photos-state";
import type { GalleryPhotoView } from "./gallery-photo";

/**
 * The flat photo feed under the album grid (or the whole page body on an
 * album's own page / a family with no albums yet). Split out of
 * photos-page-layout.tsx to keep both under CLAUDE.md's 150-line limit.
 *
 * `photos` is already scoped by the caller — either one album's photos, or
 * (on the unfiltered page) only photos not in any album — so this never
 * repeats what AlbumGrid's covers already showed above it. `scoped` picks
 * between the two renderings: unscoped (album page, or no albums at all)
 * shows the feed as the whole story with no heading, and shows
 * EmptyPhotosState when there's nothing at all; scoped (unfiltered page
 * with albums present) adds a "Без альбома" heading and renders nothing —
 * not even the heading — once every photo is already sorted into an
 * album, since a heading promising more with an empty grid under it would
 * read as broken, not tidy.
 */
export function PhotosFeedSection({
  photos,
  familyId,
  familySlug,
  canEdit,
  canUpload,
  scoped,
  activeAlbumId,
}: {
  photos: GalleryPhotoView[];
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  canUpload: boolean;
  scoped: boolean;
  /** Present only on an album's own page — lets a photo tile offer "make cover" for THIS album. */
  activeAlbumId?: string | null;
}) {
  if (!scoped) {
    return photos.length === 0 ? (
      <EmptyPhotosState canUpload={canUpload} />
    ) : (
      <PhotoGrid
        photos={photos}
        familyId={familyId}
        familySlug={familySlug}
        canEdit={canEdit}
        albumId={activeAlbumId}
      />
    );
  }

  if (photos.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 pt-2">
        <h2 className="font-heading text-xl font-medium whitespace-nowrap">
          Без альбома
        </h2>
        <div aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <PhotoGrid
        photos={photos}
        familyId={familyId}
        familySlug={familySlug}
        canEdit={canEdit}
      />
    </div>
  );
}
