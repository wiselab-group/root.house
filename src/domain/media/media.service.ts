import { vercelBlobStorageService } from "./storage.vercel-blob";
import { canView, type ActingMember } from "@/domain/family/permissions";
import type { PrivacyLevel } from "@/db/schema";
import {
  createMedia,
  deleteMediaRow,
  getAlbumsForMedia,
  getMediaById,
  getMediaForAlbum,
  getMediaForFamily,
  getMediaForPerson,
  getPeopleForMedia,
  type CreateMediaData,
  type MediaRecord,
  type MediaTaggedAlbum,
  type MediaTaggedPerson,
} from "./media.repository";

export type { MediaRecord, MediaTaggedAlbum, MediaTaggedPerson };

const storage = vercelBlobStorageService;

export interface UploadPhotoInput {
  familyId: string;
  /** People to tag this photo with — may be empty (untagged) or several (a group photo). */
  personIds: string[];
  /** Albums to add this photo to — may be empty (unalbumed) or several. */
  albumIds: string[];
  uploadedBy: string;
  file: Buffer;
  contentType: string;
  originalFilename: string;
  width?: number;
  height?: number;
  privacyLevel?: PrivacyLevel;
}

/**
 * Uploads a photo to storage and records it as Media linked to `personIds`
 * (0, 1, or several people — a group photo can tag everyone in it at once),
 * in that order — if the DB insert fails after a successful upload, the
 * orphaned blob is deleted so storage doesn't silently accumulate unlinked
 * files (there is no multi-statement DB transaction spanning an external
 * HTTP call to storage, so this is a best-effort compensating action, not a
 * true atomic guarantee).
 */
export async function uploadPersonPhoto(
  input: UploadPhotoInput,
): Promise<{ id: string }> {
  const key = `${input.familyId}/${crypto.randomUUID()}-${sanitizeFilename(input.originalFilename)}`;

  const { storageKey } = await storage.upload({
    key,
    file: input.file,
    contentType: input.contentType,
  });

  try {
    return await createMedia({
      familyId: input.familyId,
      kind: "photo",
      storageKey,
      storageProvider: storage.providerName,
      mimeType: input.contentType,
      sizeBytes: input.file.byteLength,
      width: input.width,
      height: input.height,
      uploadedBy: input.uploadedBy,
      privacyLevel: input.privacyLevel,
      personIds: input.personIds,
      albumIds: input.albumIds,
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => {
      // Best-effort cleanup — the DB insert error is what actually matters to the caller.
    });
    throw error;
  }
}

/**
 * Uploads a Person's avatar as its own Media row, deliberately NOT linked
 * via media_person or media_album — an avatar is a distinct thing from the
 * photo gallery (see person.service.ts::setPersonAvatar), not "pick one of
 * your uploaded photos", so it must never appear in getMediaForPerson, the
 * family gallery, or any album.
 */
export async function uploadPersonAvatar(
  input: Omit<UploadPhotoInput, "personIds" | "albumIds">,
): Promise<{ id: string }> {
  const key = `${input.familyId}/avatar-${crypto.randomUUID()}-${sanitizeFilename(input.originalFilename)}`;

  const { storageKey } = await storage.upload({
    key,
    file: input.file,
    contentType: input.contentType,
  });

  try {
    return await createMedia({
      familyId: input.familyId,
      kind: "photo",
      storageKey,
      storageProvider: storage.providerName,
      mimeType: input.contentType,
      sizeBytes: input.file.byteLength,
      width: input.width,
      height: input.height,
      uploadedBy: input.uploadedBy,
      personIds: [], // not linked to the gallery — see doc comment above
      albumIds: [], // not linked to any album — see doc comment above
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => {
      // Best-effort cleanup — the DB insert error is what actually matters to the caller.
    });
    throw error;
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export interface GalleryPhoto {
  media: MediaRecord;
  people: MediaTaggedPerson[];
  albums: MediaTaggedAlbum[];
}

/**
 * Pairs a flat photo list with who's tagged on each one and which albums it
 * belongs to, both batch-fetched (see getPeopleForMedia/getAlbumsForMedia)
 * so rendering the grid/lightbox never issues one query per photo. Shared
 * by getFamilyGallery, getAlbumGallery, and getPersonGallery — they only
 * differ in which photo list they start from.
 */
async function buildGalleryPhotos(
  photos: MediaRecord[],
  familyId: string,
): Promise<GalleryPhoto[]> {
  const photoIds = photos.map((photo) => photo.id);
  const [peopleByMedia, albumsByMedia] = await Promise.all([
    getPeopleForMedia(photoIds, familyId),
    getAlbumsForMedia(photoIds, familyId),
  ]);
  return photos.map((photo) => ({
    media: photo,
    people: peopleByMedia.get(photo.id) ?? [],
    albums: albumsByMedia.get(photo.id) ?? [],
  }));
}

/**
 * A Person's own photo gallery (their profile page) — same GalleryPhoto
 * shape as the family/album galleries so PersonMediaGallery can reuse
 * PhotoGrid/PhotoLightbox instead of a separate, simpler grid with no
 * lightbox at all.
 */
export async function getPersonGallery(
  personId: string,
  familyId: string,
): Promise<GalleryPhoto[]> {
  const photos = await getMediaForPerson(personId, familyId);
  return buildGalleryPhotos(photos, familyId);
}

/** The family-wide photo gallery (/families/[slug]/photos). */
export async function getFamilyGallery(
  familyId: string,
): Promise<GalleryPhoto[]> {
  const photos = await getMediaForFamily(familyId);
  return buildGalleryPhotos(photos, familyId);
}

/** One album's photos (/families/[slug]/photos/[albumId]). */
export async function getAlbumGallery(
  albumId: string,
  familyId: string,
): Promise<GalleryPhoto[]> {
  const photos = await getMediaForAlbum(albumId, familyId);
  return buildGalleryPhotos(photos, familyId);
}

export async function getMedia(
  mediaId: string,
  familyId: string,
): Promise<MediaRecord | null> {
  return getMediaById(mediaId, familyId);
}

/** Filters a list of Media down to what `member` may see per the PRIVATE
 *  visibility rule — see event.service.ts::filterVisibleEvents for the
 *  identical shape/rationale. */
export function filterVisibleMedia(
  items: MediaRecord[],
  member: ActingMember,
): MediaRecord[] {
  return items.filter((m) =>
    canView(member, { privacyLevel: m.privacyLevel, createdBy: m.uploadedBy }),
  );
}

/** Same as filterVisibleMedia, but for a gallery grid's GalleryPhoto shape
 *  (media wrapped with its tagged people/albums) — used by the family/album/
 *  person photo grids before rendering. */
export function filterVisibleGalleryPhotos(
  photos: GalleryPhoto[],
  member: ActingMember,
): GalleryPhoto[] {
  return photos.filter((p) =>
    canView(member, {
      privacyLevel: p.media.privacyLevel,
      createdBy: p.media.uploadedBy,
    }),
  );
}

/** Same IDOR-safe-preserving contract as getVisiblePerson: returns null both
 *  when the Media doesn't exist in this family AND when it exists but
 *  `member` isn't entitled to see it. */
export async function getVisibleMedia(
  mediaId: string,
  familyId: string,
  member: ActingMember,
): Promise<MediaRecord | null> {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return null;
  return canView(member, {
    privacyLevel: record.privacyLevel,
    createdBy: record.uploadedBy,
  })
    ? record
    : null;
}

/**
 * Who's tagged on a single photo — used by deleteMediaAction to know which
 * profile pages to revalidate before the underlying media_person rows are
 * cascade-deleted along with the Media row itself.
 */
export async function getTaggedPeopleForMedia(
  mediaId: string,
  familyId: string,
): Promise<MediaTaggedPerson[]> {
  const peopleByMedia = await getPeopleForMedia([mediaId], familyId);
  return peopleByMedia.get(mediaId) ?? [];
}

/**
 * Which albums a single photo belongs to — used by deleteMediaAction to
 * know which album pages to revalidate before the underlying media_album
 * rows are cascade-deleted along with the Media row itself.
 */
export async function getAlbumsForSingleMedia(
  mediaId: string,
  familyId: string,
): Promise<MediaTaggedAlbum[]> {
  const albumsByMedia = await getAlbumsForMedia([mediaId], familyId);
  return albumsByMedia.get(mediaId) ?? [];
}

export async function getMediaStream(mediaId: string, familyId: string) {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return null;
  const { stream, contentType } = await storage.getStream(record.storageKey);
  return { stream, contentType: contentType ?? record.mimeType };
}

export async function removeMedia(
  mediaId: string,
  familyId: string,
): Promise<boolean> {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return false;

  await storage.delete(record.storageKey);
  return deleteMediaRow(mediaId, familyId);
}

export type { CreateMediaData };
