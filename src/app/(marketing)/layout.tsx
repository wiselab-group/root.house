import type { ReactNode } from "react";
import type { Viewport } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

/**
 * The root layout's viewport disables pinch-zoom for the tree canvas's own
 * independent pinch-zoom (XYFlow) — that justification doesn't apply to
 * public marketing content, and disabling zoom there is a WCAG 1.4.4
 * anti-pattern. Re-enable it for this route group only.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * The app's default document language is Russian (`lang="ru"` on
 * `src/app/layout.tsx`), but the marketing page is the one deliberately
 * English surface. Rather than forking the root `<html>`, mark the English
 * content at the highest common ancestor of the marketing route group only
 * (WCAG 3.1.2 "Language of Parts") — everything else in the app keeps its
 * real `lang="ru"`.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="en" className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
