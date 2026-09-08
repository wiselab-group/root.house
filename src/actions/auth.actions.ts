"use server";

import { AuthError } from "next-auth";
import { registerSchema, credentialsSchema } from "@/lib/validation/auth";
import {
  registerUser,
  EmailAlreadyRegisteredError,
} from "@/domain/auth/auth.service";
import { signIn, signOut } from "@/lib/auth";

export interface RegisterFormState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
}

/** Only ever redirect to a same-origin relative path — a `callbackUrl` is
 *  user/URL-controlled input (query param or hidden form field), so this
 *  guards against it being abused as an open redirect to an external host. */
function safeRedirectTarget(callbackUrl: FormDataEntryValue | null): string {
  if (
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//")
  ) {
    return callbackUrl;
  }
  return "/families";
}

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: RegisterFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "email" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    await registerUser(parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return { fieldErrors: { email: error.message } };
    }
    throw error;
  }

  // Registration succeeded — sign the user in immediately via the same
  // Credentials provider rather than making them log in a second time.
  // callbackUrl (e.g. /invite/[token]) lets an invite-then-register flow
  // resume exactly where it started, instead of always landing on /families.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: safeRedirectTarget(formData.get("callbackUrl")),
  });

  return {};
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function signInWithGoogleAction(
  callbackUrl?: string,
): Promise<void> {
  await signIn("google", {
    redirectTo: safeRedirectTarget(callbackUrl ?? null),
  });
}

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Введите корректные email и пароль." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirectTarget(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный email или пароль." };
    }
    throw error;
  }

  return {};
}
