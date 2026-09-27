import { getTranslations } from "next-intl/server";
import type messages from "../../messages/ru.json";

export type ErrorCode = keyof typeof messages.errors;

/**
 * Domain services never produce user-facing text: they return or throw an
 * error *code* (a key of the `errors` namespace — "memberNotFound"), and the
 * server action translates it here in the request's locale. An unknown code
 * degrades to a generic message instead of leaking an internal string.
 */
export async function getErrorMessage(): Promise<(code: string) => string> {
  const t = await getTranslations("errors");
  return (code) =>
    t.has(code as ErrorCode) ? t(code as ErrorCode) : t("generic");
}
