import {
  createAlbum,
  deleteAlbum,
  getAlbumById,
  listAlbumsByFamily,
  type CreateAlbumData,
  type AlbumRecord,
} from "./album.repository";

export type { AlbumRecord };

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

export async function removeAlbum(
  albumId: string,
  familyId: string,
): Promise<boolean> {
  return deleteAlbum(albumId, familyId);
}
