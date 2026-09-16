"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getPerson } from "@/domain/person/person.service";
import { getMedia } from "@/domain/media/media.service";
import {
  upsertPhotoTagPosition,
  clearPhotoTagPosition,
  removePersonFromMedia,
} from "@/domain/media/media.service";
import { validatePhotoTagPoint } from "@/domain/media/photo-tag";

/**
 * Places (or moves, via the same upsert) a tap-to-tag point for `personId`
 * on `mediaId`. Any contributor+ may tag any photo they can see — unlike
 * deleteMediaAction, this doesn't require owning/editing the photo itself,
 * since tagging who's in a family photo is a collaborative act, not a
 * mutation of the photo's own lifecycle.
 */
export async function setPhotoTagPositionAction(
  familyId: string,
  familySlug: string,
  mediaId: string,
  personId: string,
  xPercent: number,
  yPercent: number,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");
  await requireFamilyAccess(familyId, session.user.id, "contributor");

  const mediaRecord = await getMedia(mediaId, familyId);
  if (!mediaRecord) throw new Error("Фото не найдено.");

  const person = await getPerson(personId, familyId);
  if (!person) throw new Error("Человек не найден.");

  const point = validatePhotoTagPoint({ xPercent, yPercent });
  await upsertPhotoTagPosition({ mediaId, personId, familyId, ...point });

  revalidatePath(`/families/${familySlug}/photos`);
  revalidatePath(`/families/${familySlug}/people/${person.slug}`);
}

/**
 * "Снять точку" — clears the point-tag but leaves the person tagged on the
 * photo (untagged/positionless), distinct from removePhotoTagAction below.
 */
export async function untagPhotoPointAction(
  familyId: string,
  familySlug: string,
  mediaId: string,
  personId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");
  await requireFamilyAccess(familyId, session.user.id, "contributor");

  const person = await getPerson(personId, familyId);
  if (!person) throw new Error("Человек не найден.");

  await clearPhotoTagPosition(mediaId, personId, familyId);

  revalidatePath(`/families/${familySlug}/photos`);
  revalidatePath(`/families/${familySlug}/people/${person.slug}`);
}

/** "Убрать из фото" — removes the person from this photo entirely. */
export async function removePhotoTagAction(
  familyId: string,
  familySlug: string,
  mediaId: string,
  personId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");
  await requireFamilyAccess(familyId, session.user.id, "contributor");

  const person = await getPerson(personId, familyId);
  if (!person) throw new Error("Человек не найден.");

  await removePersonFromMedia(mediaId, personId, familyId);

  revalidatePath(`/families/${familySlug}/photos`);
  revalidatePath(`/families/${familySlug}/people/${person.slug}`);
}
