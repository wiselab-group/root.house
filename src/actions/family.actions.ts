"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createFamilySchema } from "@/lib/validation/family";
import { createFamily } from "@/domain/family/family.service";

export interface CreateFamilyFormState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "description", string>>;
}

export async function createFamilyAction(
  _prevState: CreateFamilyFormState,
  formData: FormData,
): Promise<CreateFamilyFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Сессия истекла — войдите заново." };
  }

  const parsed = createFamilySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateFamilyFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "description") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const family = await createFamily(session.user.id, {
    name: parsed.data.name,
    description: parsed.data.description || undefined,
  });

  redirect(`/families/${family.id}`);
}
