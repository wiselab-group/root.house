"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AlbumTitleEditor } from "@/components/forms/album-title-editor";
import { AlbumActionsMenu } from "./album-actions-menu";

/**
 * Title row for /families/[slug]/photos and .../photos/[albumId] — plain
 * "Фото" + intro copy for the family-wide feed, or the album's own name +
 * description with rename/delete actions when one album is open. Renaming
 * swaps the h1 + description for AlbumTitleEditor in place, rather than
 * opening a separate form card next to the (still visible) title — that
 * used to duplicate the name on screen and push the page layout around.
 *
 * `headerActions` (PhotosPageLayout's UploadPhotoDialog) renders next to
 * the "Все альбомы" back link in the non-editing state, but is dropped
 * entirely while renaming — the two used to sit side by side in a shared
 * `flex justify-between` row regardless of which state this was in, so once
 * AlbumTitleEditor's full-width form took the title's place, the row still
 * tried to space its now-narrow form away from the button, leaving an
 * awkward empty gap between them (caught live: see the screenshot this
 * fixed). Hiding the action during editing reads as "you're mid-rename,
 * finish that first" instead — a real, if minor, affordance, not just a
 * layout patch.
 *
 * On the unfiltered-feed branch (no active album), `headerActions` sits on
 * the SAME row as the `h1` itself (`items-center justify-between`, no
 * `flex-wrap`), with the description paragraph moved below as its own
 * full-width line — not the description's original spot next to the h1
 * inside a wrapping flex row. That wrapping version dropped "Добавить
 * фото" onto its own line below the title+description block on mobile,
 * since the text column claimed the full row width before the wrap point
 * (user-reported on a live mobile screenshot). Pinning the button to the
 * h1's own (always-short, never-wrapping) row keeps it reliably beside the
 * title at every width — same fix shape as the active-album branch below,
 * which already pins its own headerActions next to the short back-link row
 * for the identical reason.
 *
 * On the active-album branch, `headerActions` sits in its own row with the
 * back link — NOT next to the (long) album title — because the title row
 * wraps at realistic album-name lengths, which used to drop the button
 * onto its own line below the title (caught live on a real album name: see
 * the screenshot that prompted this). The back-link row is short and never
 * wraps, so pinning the button there keeps it reliably on one line with
 * something, instead of it landing wherever the title row happens to
 * break. Rename/delete are AlbumActionsMenu's single `⋮` trigger next to
 * the title, not separate icon buttons — two bare pencil/trash icons
 * competing with the title for attention (user-requested consolidation
 * after seeing it live).
 */
export function AlbumPageHeader({
  familyId,
  familySlug,
  canEdit,
  activeAlbumId,
  activeAlbumName,
  activeAlbumDescription,
  headerActions,
}: {
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  activeAlbumId: string | null;
  activeAlbumName: string | null;
  activeAlbumDescription: string | null;
  headerActions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (!activeAlbumId || !activeAlbumName) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            Фото
          </h1>
          {headerActions}
        </div>
        <p className="max-w-md text-muted-foreground">
          Все фотографии семьи в одном месте — те же снимки видны и в профилях
          отмеченных на них людей.
        </p>
      </div>
    );
  }

  if (editing) {
    return (
      <AlbumTitleEditor
        familyId={familyId}
        albumId={activeAlbumId}
        defaultName={activeAlbumName}
        defaultDescription={activeAlbumDescription}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/families/${familySlug}/photos`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Все альбомы
        </Link>
        {headerActions}
      </div>
      <div className="flex items-center gap-1">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {activeAlbumName}
        </h1>
        {canEdit && (
          <AlbumActionsMenu
            familyId={familyId}
            familySlug={familySlug}
            albumId={activeAlbumId}
            albumName={activeAlbumName}
            onRename={() => setEditing(true)}
          />
        )}
      </div>
      {activeAlbumDescription && (
        <p className="text-muted-foreground">{activeAlbumDescription}</p>
      )}
    </div>
  );
}
