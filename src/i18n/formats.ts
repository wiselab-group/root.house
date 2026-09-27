import type { Formats } from "next-intl";

/** Named formats shared by every `format.dateTime(date, "long")` call. */
export const formats = {
  dateTime: {
    long: { day: "numeric", month: "long", year: "numeric" },
    longWithTime: {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  },
} satisfies Formats;

/**
 * Timestamps render server-side first, so server and client must agree on a
 * zone to avoid hydration drift. UTC matches what production (Vercel) always
 * rendered before localization.
 */
export const TIME_ZONE = "UTC";
