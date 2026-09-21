import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/ui/link-button";

/**
 * Top bar for the public marketing page — same brand-mark-plus-actions shape
 * as AppHeader, but with signed-out CTAs (log in / get started) instead of
 * breadcrumbs and a sign-out button.
 */
export function MarketingHeader() {
  return (
    <header className="border-b border-border px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <BrandMark />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LinkButton href="/login" variant="ghost">
            Log in
          </LinkButton>
          <LinkButton href="/register">Get started</LinkButton>
        </div>
      </div>
    </header>
  );
}
