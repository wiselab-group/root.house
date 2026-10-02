"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AdminLink } from "@/components/admin/admin-link";
import {
  resolveFamilyNavIcon,
  type FamilyNavItem,
} from "@/components/family-nav-context";
import { cn } from "@/lib/utils";

const PANEL_ID = "mobile-header-panel";

/**
 * Mobile-only menu toggle — sits in the header's top row next to the brand
 * mark. Open state is lifted into AppHeader so the toggle (top row) and the
 * panel it drives (full-width row below) can be laid out independently
 * while staying in sync.
 */
export function MobileHeaderToggle({
  open,
  onOpenChange,
  panelId = PANEL_ID,
  className = "md:hidden",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel it drives — the landing header has its own. */
  panelId?: string;
  /** Where it hides — the landing header keeps its links up to lg. */
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? t("closeMenu") : t("openMenu")}
      onClick={() => onOpenChange(!open)}
    >
      {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
    </Button>
  );
}

/**
 * The panel MobileHeaderToggle opens — same principle as staging.spon.to's
 * mobile nav: no overlay/drawer, the header itself expands downward in
 * place (grid-template-rows 0fr→1fr, GPU-cheap and layout-shift-free since
 * the animated track lives inside its own auto-height row), pushing page
 * content down rather than covering it. Breadcrumbs and the account row
 * move in here on mobile; on md+ they render inline in AppHeader instead.
 */
export function MobileHeaderPanel({
  open,
  breadcrumbs,
  navItems,
  userEmail,
  isAdmin,
  onNavigate,
}: {
  open: boolean;
  breadcrumbs: BreadcrumbItem[];
  /** Current family section's nav destinations (tree/people/places/settings) — see family-nav-context.tsx. Empty outside a family section. */
  navItems: FamilyNavItem[];
  userEmail: string | null | undefined;
  isAdmin: boolean;
  /** Called when a breadcrumb or nav link inside the panel is clicked, so the
   *  panel doesn't stay open behind the page it just navigated away from. */
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <div
      id={PANEL_ID}
      className="app-header-panel grid transition-[grid-template-rows] duration-slow ease-(--ease-transition) md:hidden"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-3 pt-3 transition-opacity duration-slow",
            open ? "opacity-100 delay-100" : "opacity-0",
          )}
        >
          {breadcrumbs.length > 0 && (
            <>
              {/* Click delegation instead of threading onNavigate through
                  Breadcrumbs itself — that component is shared with the
                  desktop header, which has no panel to close. */}
              <div
                onClick={(e) =>
                  (e.target as HTMLElement).closest("a") && onNavigate()
                }
              >
                <Breadcrumbs items={breadcrumbs} />
              </div>
              <span aria-hidden className="h-px w-full bg-border" />
            </>
          )}
          {navItems.length > 0 && (
            <>
              <nav
                aria-label={t("familySections")}
                className="flex flex-col gap-1"
              >
                {navItems.map(({ href, icon, label }) => {
                  const active = pathname === href;
                  const Icon = resolveFamilyNavIcon(icon);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-primary/8",
                      )}
                    >
                      <Icon
                        className="size-5 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <span aria-hidden className="h-px w-full bg-border" />
            </>
          )}
          {isAdmin && (
            <div className="-ml-2.5">
              <AdminLink withLabel onNavigate={onNavigate} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            {userEmail && (
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {userEmail}
              </span>
            )}
            <div className="flex shrink-0 items-center gap-2">
              <LocaleSwitcher />
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
