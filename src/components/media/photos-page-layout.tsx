import { PhotoGrid } from "./photo-grid";
import { AlbumGrid } from "./album-grid";
import { AlbumPageHeader } from "./album-page-header";
import { UploadPhotoDialog } from "./upload-photo-dialog";
import { EmptyPhotosState } from "./empty-photos-state";
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
 *
 * The two "add" actions used to live stacked at the very bottom of the
 * page as equal-weight outline buttons — easy to miss below a long grid,
 * and wrong about which action is primary. Uploading a photo is the
 * page's main, frequent action, so it's now a filled button pinned in the
 * header (reachable without scrolling, Google/Apple Photos-style);
 * creating an album is the rarer, structural action, so it moved into the
 * album grid itself as a "+ Новый альбом" tile (AlbumGrid/CreateAlbumTile)
 * — each action now sits next to what it actually affects.
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
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AlbumPageHeader
          familyId={familyId}
          familySlug={familySlug}
          canEdit={canEdit}
          activeAlbumId={activeAlbumId}
          activeAlbumName={activeAlbumName}
          activeAlbumDescription={activeAlbumDescription}
        />
        {canUpload && (
          <UploadPhotoDialog
            familyId={familyId}
            albums={albums}
            defaultAlbums={defaultAlbums}
          />
        )}
      </div>

      {!activeAlbumId && (
        <>
          <AlbumGrid
            familySlug={familySlug}
            albums={albums}
            familyId={familyId}
            canEdit={canEdit}
          />
          {albums.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <h2 className="font-heading text-xl font-medium whitespace-nowrap">
                Все фото
              </h2>
              <div aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>
          )}
        </>
      )}

      {photos.length === 0 && (activeAlbumId || albums.length === 0) ? (
        <EmptyPhotosState canUpload={canUpload} />
      ) : (
        <PhotoGrid
          photos={photos}
          familyId={familyId}
          familySlug={familySlug}
          canEdit={canEdit}
        />
      )}
    </main>
  );
}
