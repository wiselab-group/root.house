import { getTranslations } from "next-intl/server";
import type { z } from "zod";
import type messages from "../../messages/ru.json";

export type ValidationKey = keyof typeof messages.validation;

/**
 * Zod schemas in src/lib/validation stay framework-free: their custom
 * messages are keys of the `validation` namespace ("nameRequired"), and the
 * server action translates them here, in the request's locale, before
 * handing field errors back to the form. Length/size bounds come from the
 * issue itself (`{min}`/`{max}` in the message), so the limit is defined
 * once, in the schema. A message that isn't a known key falls back to a
 * generic "check this value" rather than leaking zod's English default.
 */
export async function getValidationMessage(): Promise<
  (issue: z.core.$ZodIssue) => string
> {
  const t = await getTranslations("validation");
  return (issue) => {
    const key = issue.message as ValidationKey;
    if (!t.has(key)) {
      // A bare .min()/.max() without a custom key still gets a localized,
      // specific message instead of the generic fallback.
      if (issue.code === "too_big" && issue.origin === "string")
        return t("tooLong", { max: Number(issue.maximum) });
      if (issue.code === "too_small" && issue.origin === "string")
        return t("tooShort", { min: Number(issue.minimum) });
      return t("invalid");
    }
    const bound: Record<string, number> =
      issue.code === "too_small"
        ? { min: Number(issue.minimum) }
        : issue.code === "too_big"
          ? { max: Number(issue.maximum) }
          : {};
    return t(key, bound);
  };
}
