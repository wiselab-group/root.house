import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";

/** Minimal closing footer for the public marketing pages — brand mark, the
 *  privacy policy and a copyright line. Log in / Register live in the
 *  header; no need to repeat them here. */
export async function MarketingFooter() {
  const t = await getTranslations("privacyPolicy");
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <BrandMark />
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link
            href="/privacy"
            className="rounded-sm text-sm text-muted-foreground transition-colors duration-base ease-(--ease-reveal) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("footerLink")}
          </Link>
          <span className="text-sm text-muted-foreground">
            &copy; {year} Root house
          </span>
        </div>
      </div>
    </footer>
  );
}
