import { vercelBlobStorageService } from "./storage.vercel-blob";
import { processImage } from "./image-variants";
import {
  isUploadKey,
  UPLOAD_RULES,
  UploadRejectedError,
  type UploadKind,
} from "./upload-rules";
import { canView, type ActingMember } from "@/domain/family/permissions";
import { logActivity } from "@/domain/activity-log/activity-log.service";
import { personDisplayName } from "@/domain/person/display-name";
import type {
  MediaVariantName,
  MediaVariants,
  PrivacyLevel,
} from "@/db/schema";
import {
  createMedia,
  deleteMediaRow,
  getAlbumsForMedia,
  getDocumentsForPerson,
  getPhotosForStory,
  getMediaById,
  getMediaForAlbum,
  getMediaForFamily,
  getMediaForPerson,
  getPeopleForMedia,
  isMediaLinked,
  isStorageKeyUsed,
  reorderMedia,
  setMediaVariants,
  upsertPhotoTagPosition,
  clearPhotoTagPosition,
  removePersonFromMedia,
  type CreateMediaData,
  type MediaRecord,
  type MediaTaggedAlbum,
  type MediaTaggedPerson,
  type UpsertPhotoTagPositionData,
} from "./media.repository";

export type { MediaRecord, MediaTaggedAlbum, MediaTaggedPerson };

const storage = vercelBlobStorageService;

/**
 * Checks a file the browser says it just put into storage, trusting none of
 * it: it must sit in this family's own uploads folder, not already belong
 * to another Media row, be private (the browser picks its own access mode),
 * and be an allowed type and size for its kind. A file that fails is
 * deleted — except one outside the folder or already in use, which may be
 * someone else's.
 */
async function verifyUploadedFile(
  storageKey: string,
  familyId: string,
  kind: UploadKind,
): Promise<{ sizeBytes: number; contentType: string }> {
  if (
    !isUploadKey(storageKey, familyId) ||
    (await isStorageKeyUsed(storageKey, familyId))
  ) {
    throw new UploadRejectedError("Файл не найден");
  }

  const info = await storage.getInfo(storageKey);
  if (!info) throw new UploadRejectedError("Файл не найден");
  const rules = UPLOAD_RULES[kind];
  const rejection = !info.isPrivate
    ? "Файл загружен не в закрытое хранилище"
    : !rules.contentTypes.includes(info.contentType)
      ? "Этот формат не поддерживается"
      : info.sizeBytes > rules.maxBytes
        ? `Файл больше ${Math.round(rules.maxBytes / 1024 ** 2)} МБ`
        : null;
  if (rejection) {
    await deleteStoredFiles([storageKey]);
    throw new UploadRejectedError(rejection);
  }
  return info;
}

export interface UploadPhotoInput {
  familyId: string;
  /** People to tag this photo with — may be empty (untagged) or several (a group photo). */
  personIds: string[];
  /** Albums to add this photo to — may be empty (unalbumed) or several. */
  albumIds: string[];
  uploadedBy: string;
  /** Where the browser already put the file (see lib/upload-photo.ts). */
  storageKey: string;
  privacyLevel?: PrivacyLevel;
}

/**
 * Records a photo the browser has just uploaded straight into Blob storage
 * as Media linked to `personIds` (0, 1, or several people — a group photo
 * can tag everyone in it at once).
 *
 * Nothing about the stored file is taken on the client's word: it must sit
 * in this family's own uploads folder, not already belong to another Media
 * row, be private, and be an allowed type and size — otherwise the blob is
 * deleted and UploadRejectedError is thrown (see verifyUploadedFile).
 *
 * The row is created without the downscaled copies — the caller makes them
 * right after responding (makePhotoVariants, via Next's after()), so the
 * uploader isn't kept waiting ~several seconds of storage round-trips at
 * the end of their progress bar. Until then, and forever if processing
 * fails, /api/media serves the original. If the DB insert fails, the stored
 * file is deleted (best-effort — there is no transaction spanning storage
 * and the DB).
 */
export async function uploadPersonPhoto(
  input: UploadPhotoInput,
): Promise<{ id: string }> {
  const { storageKey } = input;
  const info = await verifyUploadedFile(storageKey, input.familyId, "photo");

  try {
    const result = await createMedia({
      familyId: input.familyId,
      kind: "photo",
      storageKey,
      storageProvider: storage.providerName,
      mimeType: info.contentType,
      sizeBytes: info.sizeBytes,
      uploadedBy: input.uploadedBy,
      privacyLevel: input.privacyLevel,
      personIds: input.personIds,
      albumIds: input.albumIds,
    });

    const taggedPeople =
      input.personIds.length > 0
        ? await getTaggedPeopleForMedia(result.id, input.familyId)
        : [];
    await logActivity({
      familyId: input.familyId,
      actorId: input.uploadedBy,
      action: "create",
      entityType: "media",
      entityId: result.id,
      entityLabel: mediaLabel(taggedPeople),
    });

    return result;
  } catch (error) {
    await deleteStoredFiles([storageKey]);
    throw error;
  }
}

/**
 * Makes a stored photo's downscaled copies and records them — after an
 * upload (in the background) and for the one-off backfill of older photos.
 * Does nothing if the photo already has them or no longer exists; if the
 * photo was deleted while its copies were being made, the copies are
 * deleted again instead of left behind.
 */
export async function makePhotoVariants(
  mediaId: string,
  familyId: string,
): Promise<boolean> {
  const record = await getMediaById(mediaId, familyId);
  if (!record || record.kind !== "photo" || record.variants) return false;

  const processed = await storePhotoVariants(
    await storage.readBuffer(record.storageKey),
    record.mimeType,
    `${familyId}/variants/${crypto.randomUUID()}`,
  );
  if (!processed) return false;

  if (!(await setMediaVariants(mediaId, familyId, processed))) {
    await deleteStoredFiles(variantKeys(processed.variants));
    return false;
  }
  return true;
}

/**
 * Makes and uploads a photo's variants under `keyPrefix` (`-thumb.webp`,
 * `-display.webp`). Returns null — never throws — when the image can't be
 * processed (a corrupt file, an unsupported codec): losing the fast
 * copies must not lose the upload itself.
 */
export async function storePhotoVariants(
  file: Buffer,
  contentType: string,
  keyPrefix: string,
): Promise<{ width: number; height: number; variants: MediaVariants } | null> {
  let processed;
  try {
    processed = await processImage(file, contentType);
  } catch (error) {
    console.error("Failed to process photo variants:", error);
    return null;
  }

  const uploaded = await Promise.allSettled(
    processed.variants.map(async (variant) => {
      const { storageKey } = await storage.upload({
        key: `${keyPrefix}-${variant.name}.webp`,
        file: variant.buffer,
        contentType: "image/webp",
      });
      return [
        variant.name,
        {
          storageKey,
          width: variant.width,
          height: variant.height,
          sizeBytes: variant.buffer.byteLength,
        },
      ] as const;
    }),
  );
  const stored = uploaded.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (stored.length < uploaded.length) {
    await deleteStoredFiles(stored.map(([, variant]) => variant.storageKey));
    console.error("Failed to upload photo variants");
    return null;
  }

  return {
    width: processed.width,
    height: processed.height,
    variants: Object.fromEntries(stored),
  };
}

function variantKeys(variants: MediaVariants | null | undefined): string[] {
  return Object.values(variants ?? {}).map((variant) => variant.storageKey);
}

/** Best-effort — a leftover blob is cheaper than failing the caller's own error path. */
async function deleteStoredFiles(storageKeys: string[]): Promise<void> {
  await Promise.all(
    storageKeys.map((key) => storage.delete(key).catch(() => {})),
  );
}

/** "Фото" alone, or "Фото — Имя" when tagged with at least one person — media
 *  has no title field of its own, unlike Event/Story/Album. */
function mediaLabel(taggedPeople: MediaTaggedPerson[]): string {
  if (taggedPeople.length === 0) return "Фото";
  const name = personDisplayName(taggedPeople[0]);
  return taggedPeople.length > 1 ? `Фото — ${name} и другие` : `Фото — ${name}`;
}

export interface UploadDocumentInput {
  familyId: string;
  personId: string;
  uploadedBy: string;
  /** Where the browser already put the file (see lib/direct-upload.ts). */
  storageKey: string;
  /** The file's own name — shown as the document's title. */
  filename: string;
  privacyLevel?: PrivacyLevel;
}

/**
 * Records a document (scan/PDF — birth certificate, letter, ...) the
 * browser has just put into storage as Media with kind: 'document', linked
 * to exactly one Person — same checks as uploadPersonPhoto (see
 * verifyUploadedFile), but always exactly one personId (no group tagging —
 * a document belongs to the one profile it was uploaded from, see
 * DocumentUploadPanel), no variants and no width/height. `title` is the
 * original filename since documents, unlike photos, are identified by name
 * in the list UI (DocumentList), not by a thumbnail.
 */
export async function uploadPersonDocument(
  input: UploadDocumentInput,
): Promise<{ id: string }> {
  const { storageKey } = input;
  const info = await verifyUploadedFile(storageKey, input.familyId, "document");
  const title = input.filename.trim().slice(0, 200) || "Документ";

  try {
    const result = await createMedia({
      familyId: input.familyId,
      kind: "document",
      storageKey,
      storageProvider: storage.providerName,
      mimeType: info.contentType,
      sizeBytes: info.sizeBytes,
      title,
      uploadedBy: input.uploadedBy,
      privacyLevel: input.privacyLevel,
      personIds: [input.personId],
      albumIds: [],
    });

    await logActivity({
      familyId: input.familyId,
      actorId: input.uploadedBy,
      action: "create",
      entityType: "media",
      entityId: result.id,
      entityLabel: `Документ — ${title}`,
    });

    return result;
  } catch (error) {
    await deleteStoredFiles([storageKey]);
    throw error;
  }
}

/**
 * Uploads a new portrait for a Person. Since portraits and the gallery became
 * one thing (explicit user request: any gallery photo can be made the
 * portrait via «Сделать портретом»), an uploaded portrait is simply a gallery
 * photo of that person — it shows up in their «Фото» tab too, and replacing
 * it later keeps it there. The caller then points photoMediaId at it.
 */
export async function uploadPersonAvatar(
  input: Omit<UploadPhotoInput, "personIds" | "albumIds"> & {
    personId: string;
  },
): Promise<{ id: string }> {
  const { personId, ...rest } = input;
  return uploadPersonPhoto({ ...rest, personIds: [personId], albumIds: [] });
}

/**
 * Deletes a former portrait only if nothing else in the archive uses it —
 * an avatar uploaded before portraits joined the gallery would otherwise be
 * left invisible. A gallery photo just stops being the portrait.
 */
export async function removeMediaIfUnlinked(
  mediaId: string,
  familyId: string,
  actorId: string,
): Promise<void> {
  if (await isMediaLinked(mediaId, familyId)) return;
  await removeMedia(mediaId, familyId, actorId);
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

/**
 * A Person's own documents (their profile page's Документы section) — plain
 * MediaRecord list, not wrapped in GalleryPhoto: documents have no tagged-
 * people/albums concept to pair in (DocumentList has no lightbox or
 * cross-linking, unlike PhotoGrid), so there's nothing buildGalleryPhotos
 * would add here. Filtering by kind happens in SQL (getDocumentsForPerson),
 * not here, so this never accidentally mixes in the person's photos.
 */
export async function getPersonDocuments(
  personId: string,
  familyId: string,
): Promise<MediaRecord[]> {
  return getDocumentsForPerson(personId, familyId);
}

/** Photos attached to a Story (its page's hero carousel), already filtered
 *  to what `member` may see. */
export async function getVisibleStoryPhotos(
  storyId: string,
  familyId: string,
  member: ActingMember,
): Promise<MediaRecord[]> {
  return filterVisibleMedia(await getPhotosForStory(storyId, familyId), member);
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

/** Which copy of a photo to serve — see image-variants.ts. */
export type MediaSize = MediaVariantName | "original";

/** `?size=` from a media URL — anything unknown means the original. */
export function parseMediaSize(value: string | null): MediaSize {
  return value === "thumb" || value === "display" ? value : "original";
}

/**
 * Cache-Control for a served copy. Variants are immutable per media id, so
 * the browser may keep them for a month instead of re-asking every hour —
 * that's what makes reopening a large tree instant. Still `private`: it's
 * a family's photo, never for a shared cache.
 */
export function mediaCacheControl(
  requested: MediaSize,
  isVariant: boolean,
): string {
  if (isVariant) return "private, max-age=2592000, immutable";
  // A copy was asked for but isn't made yet (it's being made right after
  // upload) — serve the original without caching it under the copy's URL,
  // or the browser would keep the full file there for an hour.
  if (requested !== "original") return "private, no-cache";
  return "private, max-age=3600";
}

/**
 * Streams the requested copy — falling back to the original when that
 * variant doesn't exist (documents, photos uploaded before variants, failed
 * processing). `isVariant` tells the route it may cache hard: a variant's
 * bytes never change for a given media id.
 */
export async function getMediaStream(
  mediaId: string,
  familyId: string,
  size: MediaSize = "original",
) {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return null;
  const variant = size === "original" ? undefined : record.variants?.[size];
  const { stream, contentType } = await storage.getStream(
    variant?.storageKey ?? record.storageKey,
  );
  return {
    stream,
    contentType: variant ? "image/webp" : (contentType ?? record.mimeType),
    isVariant: Boolean(variant),
  };
}

export async function removeMedia(
  mediaId: string,
  familyId: string,
  actorId: string,
): Promise<boolean> {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return false;

  const taggedPeople = await getTaggedPeopleForMedia(mediaId, familyId);

  await storage.delete(record.storageKey);
  await deleteStoredFiles(variantKeys(record.variants));
  const deleted = await deleteMediaRow(mediaId, familyId);

  if (deleted) {
    await logActivity({
      familyId,
      actorId,
      action: "delete",
      entityType: "media",
      entityId: mediaId,
      entityLabel: mediaLabel(taggedPeople),
    });
  }

  return deleted;
}

/**
 * Persists a drag-reordered gallery grid — see media.repository.ts::reorderMedia
 * for the sortOrder scheme. familyId scoping happens inside reorderMedia's own
 * UPDATE...WHERE, so an id belonging to another family is silently dropped
 * rather than corrupting that family's ordering, same IDOR-safe shape as
 * every other family-scoped mutation.
 */
export async function reorderGalleryPhotos(
  orderedMediaIds: string[],
  familyId: string,
): Promise<void> {
  await reorderMedia(orderedMediaIds, familyId);
}

export type { CreateMediaData, UpsertPhotoTagPositionData };
export { upsertPhotoTagPosition, clearPhotoTagPosition, removePersonFromMedia };
