"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { createPlaceSchema } from "@/lib/validation/place";
import { addPlace, removePlace } from "@/domain/place/place.service";

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
  });

  revalidatePath(`/families/${familyId}/places`);
  return {};
}

export async function deletePlaceAction(familyId: string, placeId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removePlace(placeId, familyId);
  revalidatePath(`/families/${familyId}/places`);
}
