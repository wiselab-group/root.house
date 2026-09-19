"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canDelete } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import {
  getPerson,
  getPersonSlugById,
  setPersonAvatar,
} from "@/domain/person/person.service";
import {
  getAlbumsForSingleMedia,
  getMedia,
  getTaggedPeopleForMedia,
  removeMedia,
  reorderGalleryPhotos,
} from "@/domain/media/media.service";

/**
 * Photo upload itself is NOT a Server Action — see app/api/media/upload/route.ts's
 * doc comment for why (private-blob access + file body size). Deletion has
 * no such constraint, so it's a normal action like every other remove/delete.
 *
 * `personId` is an optional hint (passed when deleting from a specific
 * person's profile gallery, for the avatar defense-in-depth check below) —
 * but which profile/album pages get revalidated is NOT limited to it. A
 * photo deleted from the family-wide gallery (/families/[slug]/photos) may
 * be tagged to several people (media_person) and belong to several albums
 * (media_album) at once — every one of those pages shows this same photo,
 * so all of them need revalidating, not just whichever person's page the
 * delete happened to be clicked from, otherwise the others keep showing
 * the now-deleted photo from Next's cache until they naturally re-render.
 */
export async function deleteMediaAction(
  familyId: string,
  familySlug: string,
  mediaId: string,
  personId?: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const mediaRecord = await getMedia(mediaId, familyId);
  if (!mediaRecord) return;
  if (
    !canDelete(
      { userId: session.user.id, role: member.role },
      {
        privacyLevel: mediaRecord.privacyLevel,
        createdBy: mediaRecord.uploadedBy,
      },
    )
  ) {
    throw new ForbiddenError("У вас нет прав на удаление этого файла.");
  }

  // Fetched before removeMedia — media_person/media_album rows cascade-
  // delete with the Media row, so this must run first or there'd be
  // nothing left to find.
  const [taggedPeople, taggedAlbums] = await Promise.all([
    getTaggedPeopleForMedia(mediaId, familyId),
    getAlbumsForSingleMedia(mediaId, familyId),
  ]);

  if (personId) {
    // Avatars are never gallery photos (see media.service.ts::uploadPersonAvatar),
    // so this shouldn't match in practice — kept as defense-in-depth against a
    // dangling photoMediaId, since that column has no DB-level FK (db/schema/person.ts).
    const person = await getPerson(personId, familyId);
    if (person?.photoMediaId === mediaId) {
      await setPersonAvatar(personId, familyId, null);
    }
  }

  await removeMedia(mediaId, familyId, session.user.id);

  for (const person of taggedPeople) {
    revalidatePath(`/families/${familySlug}/people/${person.slug}`);
  }
  for (const album of taggedAlbums) {
    revalidatePath(`/families/${familySlug}/photos/${album.id}`);
  }
  revalidatePath(`/families/${familySlug}/photos`);
}

/**
 * Removes a Person's avatar — deletes the underlying Media row (the avatar
 * is its own upload, never a gallery photo, see media.service.ts::uploadPersonAvatar)
 * and clears photoMediaId. Uploading/replacing an avatar happens through
 * /api/media/upload (isAvatar=true), not this action — same reasoning as
 * deleteMediaAction's doc comment (file body needs a Route Handler).
 */
export async function removePersonAvatarAction(
  familyId: string,
  personId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const person = await getPerson(personId, familyId);
  const avatarMediaId = person?.photoMediaId ?? null;

  await setPersonAvatar(personId, familyId, null);
  if (avatarMediaId) {
    await removeMedia(avatarMediaId, familyId, session.user.id);
  }

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  revalidatePath(`/families/${familySlug}/people`);
  revalidatePath(`/families/${familySlug}/tree`);
  revalidatePath(`/families/${familySlug}/people/${personSlug}/edit`);
}

/**
 * Persists a drag-reordered gallery grid. sortOrder lives on Media itself
 * (a single global order, not one per person/album/family view — see
 * db/schema/media.ts's own doc comment), so a reorder made from any one
 * gallery is visible from every other gallery containing the same photos —
 * but only `revalidatePath` is asked to refresh the page the drag actually
 * happened on; the others pick up the new order naturally next time they're
 * visited/refreshed, same lazy-revalidation tradeoff as everywhere else in
 * this app.
 *
 * Requires `contributor` and up, same floor as deleteMediaAction — a
 * contributor may reorder photos they didn't upload, unlike canEdit's
 * "creator owns it" rule for editing a single photo's own fields, because
 * reordering is fundamentally an operation over the whole visible list, not
 * over any one photo's ownership.
 */
export async function reorderMediaAction(
  familyId: string,
  orderedMediaIds: string[],
  revalidateOnPath: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "contributor");

  await reorderGalleryPhotos(orderedMediaIds, familyId);

  revalidatePath(revalidateOnPath);
}
