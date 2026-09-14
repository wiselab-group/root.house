import { FeaturedAlbumCard } from "./featured-album-card";
import { AlbumTile } from "./album-tile";
import { CreateAlbumTile } from "./create-album-tile";
import type { AlbumWithCoverRecord } from "@/domain/album/album.service";

/**
 * Album list as a grid of folder-like cards, VK/Google Photos-style — an
 * album reads as "a place with photos in it" you open, not just a filter
 * pill. Only rendered on the unfiltered /photos page; once an album is
 * open, the breadcrumb above is the way back out.
 *
 * The most recent album (albums[0], the list is already newest-first from
 * listAlbumsWithCover) leads as FeaturedAlbumCard, a wide feature card —
 * one deliberate focal point (bolder.md's "pick one thing to remember")
 * instead of every album competing at the same identical small square. The
 * rest render as compact AlbumTile folder tiles below; that contrast (one
 * bold lead, quiet followers) is the hierarchy amplification, not a
 * louder treatment applied to all of them.
 *
 * CreateAlbumTile — the "+ Новый альбом" entry point — always renders as
 * the last tile in the compact row (Google Photos/Notion "new item in its
 * own grid" pattern), including when there are zero albums yet (no
 * featured card in that case, just this one tile) — creating an album
 * belongs with the albums it creates, not bundled into a page-header
 * action shared with photo upload (UploadPhotoDialog), a separate, much
 * more frequent action.
 */
export function AlbumGrid({
  familySlug,
  albums,
  familyId,
  canEdit,
}: {
  familySlug: string;
  albums: AlbumWithCoverRecord[];
  familyId: string;
  canEdit: boolean;
}) {
  if (albums.length === 0) {
    return canEdit ? (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <li>
          <CreateAlbumTile familyId={familyId} />
        </li>
      </ul>
    ) : null;
  }

  const [featured, ...rest] = albums;

  return (
    <div className="flex flex-col gap-3">
      <FeaturedAlbumCard
        album={featured}
        familySlug={familySlug}
        familyId={familyId}
      />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rest.map((album) => (
          <li key={album.id}>
            <AlbumTile
              album={album}
              familySlug={familySlug}
              familyId={familyId}
            />
          </li>
        ))}
        {canEdit && (
          <li>
            <CreateAlbumTile familyId={familyId} />
          </li>
        )}
      </ul>
    </div>
  );
}
