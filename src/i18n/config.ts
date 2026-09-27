export {
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  negotiateLocale,
  type Locale,
} from "@/domain/shared/locale";

/** Holds an explicit language choice (switcher or synced from
 *  `users.locale` at sign-in). Absent → Accept-Language decides. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
