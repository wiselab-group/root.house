"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="md:hidden"
      aria-expanded={open}
      aria-controls={PANEL_ID}
      aria-label={open ? "Закрыть меню" : "Открыть меню"}
      onClick={() => onOpenChange(!open)}
    >
      {open ? <XIcon /> : <MenuIcon />}
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
  userEmail,
}: {
  open: boolean;
  breadcrumbs: BreadcrumbItem[];
  userEmail: string | null | undefined;
}) {
  return (
    <div
      id={PANEL_ID}
      className="grid transition-[grid-template-rows] duration-300 ease-(--ease-transition) md:hidden"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-3 pt-3 transition-opacity duration-300",
            open ? "opacity-100 delay-100" : "opacity-0"
          )}
        >
          {breadcrumbs.length > 0 && (
            <>
              <Breadcrumbs items={breadcrumbs} />
              <span aria-hidden className="h-px w-full bg-border" />
            </>
          )}
          <div className="flex items-center justify-between gap-3">
            {userEmail && (
              <span className="min-w-0 truncate text-sm text-muted-foreground">{userEmail}</span>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
