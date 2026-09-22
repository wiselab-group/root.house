"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { createPlaceSchema, updatePlaceSchema } from "@/lib/validation/place";
import { addPlace, editPlace, removePlace } from "@/domain/place/place.service";

export interface PlaceFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createPlaceAction(
  familyId: string,
  _prevState: PlaceFormState,
  formData: FormData,
): Promise<PlaceFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createPlaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    country: formData.get("country"),
    region: formData.get("region"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await addPlace({
    familyId,
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    country: parsed.data.country || undefined,
    region: parsed.data.region || undefined,
    latitude:
      parsed.data.latitude !== undefined
        ? Number(parsed.data.latitude)
        : undefined,
    longitude:
      parsed.data.longitude !== undefined
        ? Number(parsed.data.longitude)
        : undefined,
  });

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/places`);
  revalidatePath(`/families/${slug}/map`);
  return {};
}

export async function updatePlaceAction(
  familyId: string,
  placeId: string,
  _prevState: PlaceFormState,
  formData: FormData,
): Promise<PlaceFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = updatePlaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    country: formData.get("country"),
    region: formData.get("region"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const updated = await editPlace(placeId, familyId, {
    name: parsed.data.name,
    description: parsed.data.description || null,
    country: parsed.data.country || null,
    region: parsed.data.region || null,
    latitude:
      parsed.data.latitude !== undefined ? Number(parsed.data.latitude) : null,
    longitude:
      parsed.data.longitude !== undefined
        ? Number(parsed.data.longitude)
        : null,
  });

  if (!updated) return { error: "Место не найдено." };

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/places`);
  revalidatePath(`/families/${slug}/map`);
  return {};
}

export async function deletePlaceAction(
  familyId: string,
  placeId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removePlace(placeId, familyId);
  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/places`);
}
