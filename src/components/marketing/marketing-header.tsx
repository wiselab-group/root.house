import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MarketingMobileMenu } from "./marketing-mobile-menu";
import { LANDING_ANCHORS } from "./landing-anchors";

/**
 * Top bar for the public landing: brand, three in-page links, log in and
 * the one primary action. Laid over the hero (absolute, not sticky) — the
 * page is a story to read, not an app to navigate. On phones the links
 * fold into a menu and "Start" stays visible.
 */
export function MarketingHeader() {
  const t = useTranslations("landing.nav");
  return (
    <header className="absolute inset-x-0 top-0 z-20 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
        </Link>
        <nav aria-label={t("label")} className="max-lg:hidden">
          <ul className="flex items-center gap-1">
            {LANDING_ANCHORS.map(({ id, href }) => (
              <li key={id}>
                <a
                  href={href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-base ease-(--ease-reveal) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(id)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher className="max-lg:hidden" />
          <LinkButton href="/login" variant="ghost" className="max-sm:hidden">
            {t("logIn")}
          </LinkButton>
          <LinkButton href="/register">{t("start")}</LinkButton>
          <MarketingMobileMenu />
        </div>
      </div>
    </header>
  );
}
