import type { ReactNode } from "react";
import type { Viewport } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import "./marketing.css";

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

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
