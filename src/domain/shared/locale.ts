/**
 * The UI languages the app ships in. Lives in domain/ (no next/react
 * imports) so pure domain formatters — partial dates, kinship terms — can
 * take a `locale` parameter without depending on next-intl.
 */
export const LOCALES = ["ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Used when neither a saved choice nor Accept-Language names a supported
 *  language — the archive's original audience is Russian-speaking. */
export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Picks the best supported locale from an Accept-Language header by
 * q-weight, matching on the primary subtag only ("en-GB" → "en"). Falls back
 * to DEFAULT_LOCALE for a missing/garbled header or no supported language.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return {
        primary: tag.trim().toLowerCase().split("-")[0],
        q: Number.isFinite(q) ? q : 0,
        index,
      };
    })
    .filter((entry) => entry.q > 0)
    // Stable on equal q: header order is the tie-break.
    .sort((a, b) => b.q - a.q || a.index - b.index);

  return (
    (ranked.find((entry) => isLocale(entry.primary))?.primary as
      Locale | undefined) ?? DEFAULT_LOCALE
  );
}
