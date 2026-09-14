import type { ReactNode } from "react";
import { AuthBrand } from "@/components/auth/auth-brand";

/**
 * Shared full-viewport shell for every auth-adjacent screen (login,
 * register, invite, share — the four screens a logged-out visitor can
 * land on). Centralizes the layout so all four stay visually identical by
 * construction rather than by four copies of the same className string
 * drifting apart over time. A soft radial terracotta wash behind the brand
 * mark replaces the previous flat background — the form-on-blank-canvas
 * look read as an afterthought rather than the first impression of a
 * "premium family archive" product (CLAUDE.md § WHY). The wash is a
 * background-image, not a painted element, so it never competes with
 * card/text contrast ratios.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_60%_50%_at_50%_0%,var(--color-primary)_0%,transparent_70%)] opacity-[0.07]"
      />
      <div className="relative flex w-full flex-col items-center">
        <AuthBrand />
        {children}
      </div>
    </main>
  );
}
