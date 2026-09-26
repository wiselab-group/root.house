import { revalidatePath } from "next/cache";
import { z } from "zod";
import { placeDraftSchema } from "@/lib/validation/place";
import {
  resolvePlaceChoice,
  type PlaceChoice,
} from "@/domain/place/place.service";

/**
 * Reads what a PlaceField named `field` submitted: `<field>` carries a saved
 * Place's id, `<field>Draft` a new place as JSON. A malformed draft or a
 * non-uuid id is treated as "no place" rather than an error — the field is
 * optional everywhere it's used, and neither can come from the real UI.
 */
export function placeChoiceFromFormData(
  formData: FormData,
  field: string,
): PlaceChoice {
  const rawId = formData.get(field);
  const placeId =
    typeof rawId === "string" && z.string().uuid().safeParse(rawId).success
      ? rawId
      : null;
  return { placeId, draft: parseDraft(formData.get(`${field}Draft`)) };
}

function parseDraft(raw: FormDataEntryValue | null): PlaceChoice["draft"] {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const parsed = placeDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Resolves several PlaceFields of one form to Place ids (creating new
 * places as needed — see resolvePlaceChoice). `createdAny` tells the action
 * to also revalidate the Places and Map pages.
 */
export async function resolvePlaceFields<Field extends string>(
  familyId: string,
  formData: FormData,
  fields: readonly Field[],
): Promise<{ ids: Record<Field, string | null>; createdAny: boolean }> {
  const results = await Promise.all(
    fields.map((field) =>
      resolvePlaceChoice(familyId, placeChoiceFromFormData(formData, field)),
    ),
  );
  const ids = {} as Record<Field, string | null>;
  fields.forEach((field, i) => {
    ids[field] = results[i].placeId;
  });
  return { ids, createdAny: results.some((result) => result.created) };
}

/** After a form created a Place implicitly — the Places list and Map show it. */
export function revalidatePlacePages(familySlug: string | null) {
  revalidatePath(`/families/${familySlug}/places`);
  revalidatePath(`/families/${familySlug}/map`);
}
