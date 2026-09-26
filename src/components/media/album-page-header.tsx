"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ImagesIcon } from "lucide-react";
import { AlbumTitleEditor } from "@/components/forms/album-title-editor";
import { AlbumActionsMenu } from "./album-actions-menu";
import { photoCountLabel } from "@/domain/shared/pluralize-ru";

/**
 * Title row for /families/[slug]/photos and .../photos/[albumId] — plain
 * «Архив» (the section's name in every nav — the URL stays /photos, see
 * docs/PRODUCT-REFACTOR.md) + intro copy for the family-wide feed, or the album's own name +
 * description with rename/delete actions when one album is open. Renaming
 * opens AlbumTitleEditor as a Dialog over the page rather than swapping the
 * h1 for an inline form — an earlier version did the latter (see
 * AlbumTitleEditor's own doc comment for why that changed); the header
 * below no longer branches on an editing state at all, since the dialog
 * renders independently on top of it.
 *
 * `headerActions` (PhotosPageLayout's UploadPhotoDialog) renders next to
 * the "Все альбомы" back link. On the unfiltered-feed branch (no active
 * album), `headerActions` sits on
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
 *
 * The ImagesIcon + "Альбом · N фото" line under the title carries the same
 * "this is an album" visual language as AlbumTile's grid card (icon +
 * photoCountLabel) onto the opened album's own page — without it, an open
 * album was just a bare h1 indistinguishable from a person's profile
 * heading or any other titled page (user-reported after seeing it live).
 * The literal word "Альбом" was folded into this same line rather than
 * given its own eyebrow row above the h1 — a separate label would have
 * stacked three redundant "you're in an album" signals (eyebrow, title,
 * icon+count) in one small area (user-requested consolidation).
 */
export function AlbumPageHeader({
  familyId,
  familySlug,
  canEdit,
  activeAlbumId,
  activeAlbumName,
  activeAlbumDescription,
  activeAlbumPhotoCount,
  headerActions,
}: {
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  activeAlbumId: string | null;
  activeAlbumName: string | null;
  activeAlbumDescription: string | null;
  activeAlbumPhotoCount: number;
  headerActions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (!activeAlbumId || !activeAlbumName) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            Архив
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
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ImagesIcon className="size-3.5" />
        <span>Альбом · {photoCountLabel(activeAlbumPhotoCount)}</span>
      </div>
      {activeAlbumDescription && (
        <p className="text-muted-foreground">{activeAlbumDescription}</p>
      )}
      {canEdit && (
        <AlbumTitleEditor
          familyId={familyId}
          albumId={activeAlbumId}
          defaultName={activeAlbumName}
          defaultDescription={activeAlbumDescription}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </div>
  );
}
