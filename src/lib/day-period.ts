/**
 * Time of day in the viewer's own zone, for Family Home's greeting
 * («Добрый вечер, Александр»). The server renders in UTC (i18n/formats.ts),
 * so the browser writes its zone into TIME_ZONE_COOKIE once
 * (components/family/time-zone-cookie.tsx); until then there's no period
 * and the greeting stays neutral — never a guessed «Доброе утро» that the
 * client would then have to swap.
 */
export type DayPeriod = "morning" | "day" | "evening" | "night";

export const TIME_ZONE_COOKIE = "tz";

/** Whether `value` is an IANA zone this runtime knows («Europe/Tallinn»). */
export function isTimeZone(value: string | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** 5–11 morning, 12–16 day, 17–22 evening, 23–4 night. */
export function dayPeriod(now: Date, timeZone: string): DayPeriod {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    }).format(now),
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "day";
  if (hour >= 17 && hour < 23) return "evening";
  return "night";
}
