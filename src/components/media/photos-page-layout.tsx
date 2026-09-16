import { AlbumGrid } from "./album-grid";
import { AlbumPageHeader } from "./album-page-header";
import { UploadPhotoDialog } from "./upload-photo-dialog";
import { PhotosFeedSection } from "./photos-feed-section";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import type { GalleryPhotoView } from "./gallery-photo";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/**
 * Shared page shell for /families/[slug]/photos and .../photos/[albumId].
 * The unfiltered page leads with the album grid (folder-style cards with a
 * cover photo) above the flat photo feed — an album reads as a place you
 * open, not just a tab filter. Once inside one album, the breadcrumb above
 * is the way back out — a pill row repeating "Без альбома" + the current
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
 *
 * `photos` on the unfiltered page is pre-filtered by the caller (see
 * photos/page.tsx) to exclude anything already in an album — it used to be
 * the family's ENTIRE photo list, so every album cover above also showed
 * up again in the flat feed below it, on the same page. PhotosFeedSection
 * scopes that feed's heading/emptiness accordingly (`scoped` prop below).
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
      <AlbumPageHeader
        familyId={familyId}
        familySlug={familySlug}
        canEdit={canEdit}
        activeAlbumId={activeAlbumId}
        activeAlbumName={activeAlbumName}
        activeAlbumDescription={activeAlbumDescription}
        activeAlbumPhotoCount={photos.length}
        headerActions={
          canUpload && (
            <UploadPhotoDialog
              familyId={familyId}
              albums={albums}
              defaultAlbums={defaultAlbums}
            />
          )
        }
      />

      {!activeAlbumId && (
        <AlbumGrid
          familySlug={familySlug}
          albums={albums}
          familyId={familyId}
          canEdit={canEdit}
        />
      )}

      <PhotosFeedSection
        photos={photos}
        familyId={familyId}
        familySlug={familySlug}
        canEdit={canEdit}
        canUpload={canUpload}
        scoped={!activeAlbumId && albums.length > 0}
        activeAlbumId={activeAlbumId}
      />
    </main>
  );
}
