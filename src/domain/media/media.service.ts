import { vercelBlobStorageService } from "./storage.vercel-blob";
import { processImage } from "./image-variants";
import { normalizePhotoCaption } from "./photo-caption";
import {
  isUploadKey,
  UPLOAD_RULES,
  UploadRejectedError,
  type UploadKind,
} from "./upload-rules";
import { canView, type ActingMember } from "@/domain/family/permissions";
import { logActivity } from "@/domain/activity-log/activity-log.service";
import type { Locale } from "@/domain/shared/locale";
import { personDisplayName } from "@/domain/person/display-name";
import { getVisiblePerson } from "@/domain/person/person.service";
import { resolveByteRange } from "./byte-range";
import { getVisibleStory } from "@/domain/story/story.service";
import { getNarrationStoryId } from "@/domain/story/story-narration.repository";
import { getVoicePersonId } from "@/domain/person-voice/person-voice.repository";
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
  getPhotosByIds,
  getMediaById,
  getMediaForAlbum,
  getMediaForFamily,
  getMediaForPerson,
  getPeopleForMedia,
  isMediaLinked,
  isStorageKeyUsed,
  reorderMedia,
  setMediaTitle,
  setMediaVariants,
  upsertPhotoTagPosition,
  removePersonFromMedia,
  replaceStoryPhotos,
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
    throw new UploadRejectedError("fileNotFound");
  }

  const info = await storage.getInfo(storageKey);
  if (!info) throw new UploadRejectedError("fileNotFound");
  const rules = UPLOAD_RULES[kind];
  const rejection = !info.isPrivate
    ? "notPrivateStorage"
    : !rules.contentTypes.includes(info.contentType)
      ? "unsupportedFormat"
      : info.sizeBytes > rules.maxBytes
        ? "fileTooLarge"
        : null;
  if (rejection) {
    await deleteStoredFiles([storageKey]);
    throw new UploadRejectedError(rejection, {
      max: Math.round(rules.maxBytes / 1024 ** 2),
    });
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
  /** Already normalized (photo-caption.ts) — null for none. */
  caption?: string | null;
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
  locale: Locale,
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
      title: input.caption ?? null,
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
      entityLabel: mediaLabel(taggedPeople, locale),
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

/** Checks a recording the browser has put into storage (a story read
 *  aloud, a voice on a profile) — the same folder/privacy/type/size checks
 *  as every other upload, kind "audio". */
export async function verifyAudioUpload(
  storageKey: string,
  familyId: string,
): Promise<{ sizeBytes: number; contentType: string }> {
  return verifyUploadedFile(storageKey, familyId, "audio");
}

/** Removes a recording's audio — its media row (the story_narration or
 *  person_voice row goes with it, FK cascade) and its file. Only ever an
 *  "audio" row: never a photo or document, whatever id is passed. */
export async function deleteAudioMedia(
  mediaId: string,
  familyId: string,
): Promise<void> {
  const record = await getMediaById(mediaId, familyId);
  if (!record || record.kind !== "audio") return;
  await deleteMediaRow(mediaId, familyId);
  await deleteStoredFiles([record.storageKey]);
}

/** A file the browser uploaded that won't be recorded after all. */
export async function discardUploadedFile(storageKey: string): Promise<void> {
  await deleteStoredFiles([storageKey]);
}

export const mediaStorageProvider = storage.providerName;

/** Best-effort — a leftover blob is cheaper than failing the caller's own error path. */
async function deleteStoredFiles(storageKeys: string[]): Promise<void> {
  await Promise.all(
    storageKeys.map((key) => storage.delete(key).catch(() => {})),
  );
}

/** "Фото" alone, or "Фото — Имя" when tagged with at least one person — media
 *  has no title field of its own, unlike Event/Story/Album. */
function mediaLabel(taggedPeople: MediaTaggedPerson[], locale: Locale): string {
  const photo = locale === "ru" ? "Фото" : "Photo";
  if (taggedPeople.length === 0) return photo;
  const name = personDisplayName(taggedPeople[0], locale);
  if (taggedPeople.length === 1) return `${photo} — ${name}`;
  return locale === "ru"
    ? `${photo} — ${name} и другие`
    : `${photo} — ${name} and others`;
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
  locale: Locale,
): Promise<{ id: string }> {
  const { storageKey } = input;
  const info = await verifyUploadedFile(storageKey, input.familyId, "document");
  const documentWord = locale === "ru" ? "Документ" : "Document";
  const title = input.filename.trim().slice(0, 200) || documentWord;

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
      entityLabel: `${documentWord} — ${title}`,
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
  locale: Locale,
): Promise<{ id: string }> {
  const { personId, ...rest } = input;
  return uploadPersonPhoto(
    { ...rest, personIds: [personId], albumIds: [] },
    locale,
  );
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
  locale: Locale,
): Promise<void> {
  if (await isMediaLinked(mediaId, familyId)) return;
  await removeMedia(mediaId, familyId, actorId, locale);
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

/** Photos placed inside a Story's text (story-doc.ts's StoryPhoto), limited
 *  to this family and to what `member` may see — a photo the reader can't
 *  see is simply left out of the text. */
export async function getVisibleStoryTextPhotos(
  mediaIds: string[],
  familyId: string,
  member: ActingMember,
): Promise<MediaRecord[]> {
  const unique = [...new Set(mediaIds)];
  return filterVisibleMedia(await getPhotosByIds(unique, familyId), member);
}

/**
 * Saves the photos `member` picked for a Story's hero carousel, in order.
 * Only photos `member` may see can be added. Attached photos `member` can't
 * see (another member's private photo) never reached their editor, so they
 * are kept, after the picked ones, rather than silently unlinked.
 */
export async function setStoryPhotos(
  storyId: string,
  familyId: string,
  member: ActingMember,
  mediaIds: string[],
): Promise<void> {
  const current = await getPhotosForStory(storyId, familyId);
  const hidden = current
    .filter((photo) => filterVisibleMedia([photo], member).length === 0)
    .map((photo) => photo.id);
  const hiddenIds = new Set(hidden);
  const picked = [...new Set(mediaIds)].filter((id) => !hiddenIds.has(id));

  const pickable = await Promise.all(
    picked.map((id) => getMediaById(id, familyId)),
  );
  const visible = filterVisibleMedia(
    pickable.filter((photo) => photo !== null),
    member,
  ).map((photo) => photo.id);

  await replaceStoryPhotos(storyId, familyId, [...visible, ...hidden]);
}

/** Every family photo `member` may see, in gallery order — the story editor's
 *  «Фото истории» picker. */
export async function listPickablePhotos(
  familyId: string,
  member: ActingMember,
): Promise<MediaRecord[]> {
  return filterVisibleMedia(await getMediaForFamily(familyId), member);
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
  // A recording is heard by exactly who may see what it belongs to — a
  // story read aloud follows its story, a voice follows its person; the
  // media row carries no privacy of its own. Audio with neither behind it
  // is heard by no one.
  if (record.kind === "audio") {
    const storyId = await getNarrationStoryId(mediaId, familyId);
    if (storyId) {
      const story = await getVisibleStory(storyId, familyId, member);
      return story ? record : null;
    }
    const personId = await getVoicePersonId(mediaId, familyId);
    const person =
      personId && (await getVisiblePerson(personId, familyId, member));
    return person ? record : null;
  }
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
/**
 * A Media file's bytes for the media route — whole, or the byte range the
 * browser asked for (`rangeHeader`, see byte-range.ts): audio seeks by
 * range, and Safari won't play audio at all from a server that can't.
 * `range` is set only when the store really returned just that range;
 * `unsatisfiable` (the file's size) means answer 416.
 */
export async function getMediaStream(
  mediaId: string,
  familyId: string,
  size: MediaSize = "original",
  rangeHeader: string | null = null,
) {
  const record = await getMediaById(mediaId, familyId);
  if (!record) return null;
  const variant = size === "original" ? undefined : record.variants?.[size];
  const storageKey = variant?.storageKey ?? record.storageKey;
  const typeOf = (stored: string | null) =>
    variant ? "image/webp" : (stored ?? record.mimeType);

  const info = rangeHeader ? await storage.getInfo(storageKey) : null;
  if (info) {
    const range = resolveByteRange(rangeHeader, info.sizeBytes);
    if (range === "unsatisfiable") {
      return {
        stream: null,
        contentType: typeOf(info.contentType),
        isVariant: Boolean(variant),
        totalSize: info.sizeBytes,
        range: null,
        unsatisfiable: true,
      };
    }
    if (range) {
      const part = await storage.getStream(storageKey, range);
      return {
        stream: part.stream,
        contentType: typeOf(part.contentType),
        isVariant: Boolean(variant),
        totalSize: info.sizeBytes,
        range: part.partial ? range : null,
        unsatisfiable: false,
      };
    }
  }

  const whole = await storage.getStream(storageKey);
  return {
    stream: whole.stream,
    contentType: typeOf(whole.contentType),
    isVariant: Boolean(variant),
    totalSize: whole.size,
    range: null,
    unsatisfiable: false,
  };
}

export async function removeMedia(
  mediaId: string,
  familyId: string,
  actorId: string,
  locale: Locale,
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
      entityLabel: mediaLabel(taggedPeople, locale),
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

/** Sets or clears a photo's caption. `caption` is raw user input —
 *  normalized (and length-checked) here, see photo-caption.ts. */
export async function updatePhotoCaption(
  mediaId: string,
  familyId: string,
  caption: unknown,
): Promise<string | null> {
  const normalized = normalizePhotoCaption(caption);
  await setMediaTitle(mediaId, familyId, normalized);
  return normalized;
}

export type { CreateMediaData, UpsertPhotoTagPositionData };
export { upsertPhotoTagPosition, removePersonFromMedia };
