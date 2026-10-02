"use client";

import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { cn } from "@/lib/utils";
import { LANDING_ANCHORS } from "./landing-anchors";

export const MARKETING_PANEL_ID = "marketing-header-panel";

/**
 * The landing's phone menu, built like the app's (MobileHeaderPanel): no
 * popover or drawer — the header itself expands downward in place
 * (grid-template-rows 0fr→1fr), the content fading in after it. Section
 * links with their icons, a rule, then language and log in on one row, as
 * the app's panel ends with language and sign out.
 */
export function MarketingMobilePanel({
  open,
  onNavigate,
}: {
  open: boolean;
  /** Closes the panel once a link inside it is followed. */
  onNavigate: () => void;
}) {
  const t = useTranslations("landing.nav");
  return (
    <div
      id={MARKETING_PANEL_ID}
      inert={!open}
      className="grid transition-[grid-template-rows] duration-slow ease-(--ease-transition) lg:hidden"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-3 pt-3 transition-opacity duration-slow",
            open ? "opacity-100 delay-100" : "opacity-0",
          )}
        >
          <nav aria-label={t("label")} className="flex flex-col gap-1">
            {LANDING_ANCHORS.map(({ id, href, Icon }) => (
              <a
                key={id}
                href={href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-primary/8"
              >
                <Icon
                  className="size-5 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {t(id)}
              </a>
            ))}
          </nav>
          <span aria-hidden className="h-px w-full bg-border" />
          <div className="flex items-center justify-between gap-3">
            <LocaleSwitcher />
            <LinkButton
              href="/login"
              variant="ghost"
              size="sm"
              onClick={onNavigate}
            >
              {t("logIn")}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
