import {
  createAlbum,
  deleteAlbum,
  getAlbumById,
  listAlbumsByFamily,
  listAlbumsWithCoverByFamily,
  updateAlbum,
  type CreateAlbumData,
  type UpdateAlbumData,
  type AlbumRecord,
  type AlbumWithCoverRecord,
} from "./album.repository";

export type { AlbumRecord, AlbumWithCoverRecord };

export async function addAlbum(data: CreateAlbumData): Promise<{ id: string }> {
  return createAlbum(data);
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
): Promise<boolean> {
  return deleteAlbum(albumId, familyId);
}

export async function editAlbum(
  albumId: string,
  familyId: string,
  data: UpdateAlbumData,
): Promise<boolean> {
  return updateAlbum(albumId, familyId, data);
}
