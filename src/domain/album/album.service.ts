import { logActivity } from "@/domain/activity-log/activity-log.service";
import {
  createAlbum,
  deleteAlbum,
  getAlbumById,
  listAlbumsByFamily,
  listAlbumsWithCoverByFamily,
  setAlbumCover,
  updateAlbum,
  type CreateAlbumData,
  type UpdateAlbumData,
  type AlbumRecord,
  type AlbumWithCoverRecord,
} from "./album.repository";

export type { AlbumRecord, AlbumWithCoverRecord };

export async function addAlbum(
  data: CreateAlbumData,
  actorId: string,
): Promise<{ id: string }> {
  const result = await createAlbum(data);

  await logActivity({
    familyId: data.familyId,
    actorId,
    action: "create",
    entityType: "album",
    entityId: result.id,
    entityLabel: data.name,
  });

  return result;
}

export async function getAlbum(
  albumId: string,
  familyId: string,
): Promise<AlbumRecord | null> {
  return getAlbumById(albumId, familyId);
}

export async function listAlbums(familyId: string): Promise<AlbumRecord[]> {
  return listAlbumsByFamily(familyId);
}

/** Album list annotated with cover photo + count, for the album grid. */
export async function listAlbumsWithCover(
  familyId: string,
): Promise<AlbumWithCoverRecord[]> {
  return listAlbumsWithCoverByFamily(familyId);
}

export async function removeAlbum(
  albumId: string,
  familyId: string,
  actorId: string,
): Promise<boolean> {
  const album = await getAlbumById(albumId, familyId);
  const deleted = await deleteAlbum(albumId, familyId);

  if (deleted && album) {
    await logActivity({
      familyId,
      actorId,
      action: "delete",
      entityType: "album",
      entityId: albumId,
      entityLabel: album.name,
    });
  }

  return deleted;
}

export async function editAlbum(
  albumId: string,
  familyId: string,
  actorId: string,
  data: UpdateAlbumData,
): Promise<boolean> {
  const updated = await updateAlbum(albumId, familyId, data);

  if (updated) {
    const album = await getAlbumById(albumId, familyId);
    await logActivity({
      familyId,
      actorId,
      action: "update",
      entityType: "album",
      entityId: albumId,
      entityLabel: album?.name ?? "Альбом",
    });
  }

  return updated;
}

/** Sets the album's cover to one of its own photos, or clears it (mediaId
 *  null) back to the automatic "most recent photo" default. */
export async function setAlbumCoverPhoto(
  albumId: string,
  familyId: string,
  mediaId: string | null,
): Promise<boolean> {
  return setAlbumCover(albumId, familyId, mediaId);
}
