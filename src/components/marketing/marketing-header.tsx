import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleSwitcher } from "@/components/locale-switcher";

/**
 * Top bar for the public marketing page — same brand-mark-plus-actions shape
 * as AppHeader, but with signed-out CTAs (log in / get started) instead of
 * breadcrumbs and a sign-out button. Laid over the hero (absolute), so the
 * hero's sticky viewport starts at the very top of the screen.
 */
export function MarketingHeader() {
  const t = useTranslations("landing");
  return (
    <header className="absolute inset-x-0 top-0 z-20 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <BrandMark />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher className="max-sm:hidden" />
          <LinkButton href="/login" variant="ghost">
            {t("logIn")}
          </LinkButton>
          <LinkButton href="/register">{t("getStarted")}</LinkButton>
        </div>
      </div>
    </header>
  );
}
