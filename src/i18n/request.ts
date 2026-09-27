import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, LOCALE_COOKIE, negotiateLocale } from "./config";
import { formats, TIME_ZONE } from "./formats";

/**
 * next-intl without i18n routing: URLs carry no locale. The explicit choice
 * (cookie) wins, otherwise the browser's Accept-Language, otherwise Russian.
 */
export default getRequestConfig(async () => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    formats,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
