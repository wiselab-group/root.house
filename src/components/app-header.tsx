"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useBreadcrumbs } from "@/components/breadcrumbs-context";

/** Top bar for the authenticated area — brand mark link, current page's breadcrumb trail, sign out. */
export function AppHeader({ userEmail }: { userEmail: string | null | undefined }) {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/families" className="shrink-0">
          <BrandMark />
        </Link>
        {breadcrumbs.length > 0 && (
          <>
            <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
            <Breadcrumbs items={breadcrumbs} />
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {userEmail && <span className="text-sm text-muted-foreground">{userEmail}</span>}
        <SignOutButton />
      </div>
    </header>
  );
}
