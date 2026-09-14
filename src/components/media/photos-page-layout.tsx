import { ImagesIcon } from "lucide-react";
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
      />

      {!activeAlbumId && (
        <>
          <AlbumGrid
            familySlug={familySlug}
            albums={albums}
            familyId={familyId}
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

/** Same teaching-empty-state shape as /families, /people and /places — a
 *  concrete next step, not a bare "nothing here". On the unfiltered /photos
 *  page this only shows once there are no albums either (an album-only
 *  family with zero loose photos still has the album grid above to show for
 *  itself, so this would be redundant noise under it) — but inside a
 *  specific empty album (activeAlbumId set) it always shows regardless of
 *  the family's other albums, since a blank PhotoGrid with no explanation
 *  would otherwise render silently. Non-uploaders see plain copy with no
 *  dead-end CTA they can't act on — the family's own PhotosPageActions is
 *  the only upload entry point either way, so no button is duplicated here. */
function EmptyPhotosState({ canUpload }: { canUpload: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ImagesIcon className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="font-heading text-xl font-medium">
          Фотографий пока нет
        </h2>
        <p className="text-muted-foreground">
          {canUpload
            ? "Добавьте первое фото — со временем здесь соберётся семейный альбом."
            : "Когда кто-то из семьи добавит фото, они появятся здесь."}
        </p>
      </div>
    </div>
  );
}
