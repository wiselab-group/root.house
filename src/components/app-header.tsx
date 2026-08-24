"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobileHeaderToggle, MobileHeaderPanel } from "@/components/mobile-header-panel";
import { useBreadcrumbs } from "@/components/breadcrumbs-context";

/**
 * Top bar for the authenticated area — brand mark link, current page's
 * breadcrumb trail, sign out. On md+ everything sits in one row; below md
 * the breadcrumb trail and account row move into MobileHeaderPanel, which
 * expands the header in place behind MobileHeaderToggle (see that file) —
 * the same principle as staging.spon.to's mobile nav.
 */
export function AppHeader({ userEmail }: { userEmail: string | null | undefined }) {
  const breadcrumbs = useBreadcrumbs();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-border px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/families" className="shrink-0">
            <BrandMark />
          </Link>
          {breadcrumbs.length > 0 && (
            <>
              <span aria-hidden className="hidden h-4 w-px shrink-0 bg-border md:block" />
              <div className="hidden min-w-0 md:block">
                <Breadcrumbs items={breadcrumbs} />
              </div>
            </>
          )}
        </div>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {userEmail && <span className="text-sm text-muted-foreground">{userEmail}</span>}
          <SignOutButton />
        </div>
        <MobileHeaderToggle open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
      <MobileHeaderPanel open={menuOpen} breadcrumbs={breadcrumbs} userEmail={userEmail} />
    </header>
  );
}
