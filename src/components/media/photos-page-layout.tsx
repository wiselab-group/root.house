import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PhotoGrid } from "./photo-grid";
import { AlbumGrid } from "./album-grid";
import { AlbumPageHeader } from "./album-page-header";
import { PhotosPageActions } from "./photos-page-actions";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import type { GalleryPhotoView } from "./gallery-photo";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/**
 * Shared page shell for /families/[slug]/photos and .../photos/[albumId].
 * The unfiltered page leads with the album grid (folder-style cards with a
 * cover photo) above the flat photo feed — an album reads as a place you
 * open, not just a tab filter. Once inside one album, the breadcrumb above
 * is the way back out — a pill row repeating "Все фото" + the current
 * album's own (already-visible-in-the-title) name added nothing.
 */
export function PhotosPageLayout({
  familyId,
  familySlug,
  familyName,
  canEdit,
  canUpload = canEdit,
  albums,
  activeAlbumId,
  activeAlbumName,
  activeAlbumDescription,
  photos,
}: {
  familyId: string;
  familySlug: string;
  familyName: string;
  /** May edit album metadata / delete arbitrary photos — owner/editor only. */
  canEdit: boolean;
  /** May upload new photos — owner/editor/contributor (defaults to canEdit
   *  when omitted, for any caller not yet passing this explicitly). */
  canUpload?: boolean;
  albums: AlbumWithCoverRecord[];
  activeAlbumId: string | null;
  activeAlbumName: string | null;
  activeAlbumDescription: string | null;
  photos: GalleryPhotoView[];
}) {
  // Uploading from an album's own page ("Добавить фото" on
  // /photos/[albumId]) should default to tagging the new photo into THIS
  // album — without this, a photo uploaded here silently ends up in no
  // album at all unless the user separately re-picks it in the combobox,
  // which reads as "the upload didn't work" from the album page.
  const defaultAlbums =
    activeAlbumId && activeAlbumName
      ? [{ id: activeAlbumId, name: activeAlbumName }]
      : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={
          activeAlbumName
            ? [
                { label: "Мои семьи", href: "/families" },
                { label: familyName, href: `/families/${familySlug}` },
                { label: "Фото", href: `/families/${familySlug}/photos` },
                { label: activeAlbumName },
              ]
            : [
                { label: "Мои семьи", href: "/families" },
                { label: familyName, href: `/families/${familySlug}` },
                { label: "Фото" },
              ]
        }
      />
      <AlbumPageHeader
        familyId={familyId}
        familySlug={familySlug}
        canEdit={canEdit}
        activeAlbumId={activeAlbumId}
        activeAlbumName={activeAlbumName}
        activeAlbumDescription={activeAlbumDescription}
      />

      {!activeAlbumId && (
        <>
          <AlbumGrid
            familySlug={familySlug}
            albums={albums}
            familyId={familyId}
          />
          {albums.length > 0 && (
            <h2 className="font-heading text-lg font-medium">Все фото</h2>
          )}
        </>
      )}

      {photos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Фотографий пока нет</CardTitle>
            <CardDescription>Добавьте первое фото.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <PhotoGrid
          photos={photos}
          familyId={familyId}
          familySlug={familySlug}
          canEdit={canEdit}
        />
      )}

      {canUpload && (
        <PhotosPageActions
          familyId={familyId}
          albums={albums}
          defaultAlbums={defaultAlbums}
        />
      )}
    </main>
  );
}
