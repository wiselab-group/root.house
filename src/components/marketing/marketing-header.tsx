"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileHeaderToggle } from "@/components/mobile-header-panel";
import {
  MARKETING_PANEL_ID,
  MarketingMobilePanel,
} from "./marketing-mobile-panel";
import { LANDING_ANCHORS } from "./landing-anchors";

/**
 * Top bar for the public landing: brand, three in-page links, log in and
 * the one primary action. Laid over the hero (absolute, not sticky) — the
 * page is a story to read, not an app to navigate. Below lg the links fold
 * into the app's own kind of menu: ☰ / ✕ (MobileHeaderToggle) expands the
 * header in place, which turns into the app's translucent glass bar while
 * open; any tap outside it closes it, as in AppHeader. "Start" stays
 * visible throughout.
 */
export function MarketingHeader() {
  const t = useTranslations("landing.nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className="marketing-header sticky top-0 z-40 border-b border-glass-edge bg-background/70 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
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
            <LinkButton href="/login" variant="ghost" className="max-lg:hidden">
              {t("logIn")}
            </LinkButton>
            <LinkButton href="/register">{t("start")}</LinkButton>
            <MobileHeaderToggle
              open={menuOpen}
              onOpenChange={setMenuOpen}
              panelId={MARKETING_PANEL_ID}
              className="lg:hidden"
            />
          </div>
        </div>
        <MarketingMobilePanel
          open={menuOpen}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
    </header>
  );
}
