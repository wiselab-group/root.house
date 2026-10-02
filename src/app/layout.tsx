import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { VercelTelemetry } from "@/components/vercel-telemetry";
import "./globals.css";

// `subsets` must include "cyrillic" — the UI ships in Russian and English
// (next-intl, messages/*.json), and family names are Cyrillic in either.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

// Warm serif for Person Profile / Story headings (DESIGN.md's original
// Fraunces/DM Serif Display candidates don't ship a cyrillic subset at all —
// Lora does, and reads with the same "archival, not corporate" warmth).
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: {
      // template applies to every page that sets its own `title` below this
      // layout; `default` is the fallback for the few that don't (the root
      // redirect page, auth pages that set their own absolute title).
      template: "%s — Root house",
      default: "Root house",
    },
    description: t("description"),
  };
}

// Disables page pinch/double-tap zoom on mobile — the tree canvas has its
// own independent pinch-zoom via XYFlow, unaffected by this.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    // `dark` app-wide (user request 2026-09-25): every page uses the warm
    // dark archive palette Family Home introduced — see .dark in globals.css.
    // suppressHydrationWarning: the landing's first-visit intro script sets
    // data-intro on <html> before hydration (see intro-script.ts) — this
    // only silences that one element's own attribute diff, not its children.
    <html
      suppressHydrationWarning
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {children}
          {/* Global toast host (sonner) — mounted once at the root so any
            client component can call `toast(...)` without its own portal.
            First consumer: tree-canvas.tsx's setFocus confirms a
            "Сделать фокус-персоной" click with an undo affordance, since
            that action silently persists a per-user default otherwise. */}
          <Toaster position="bottom-center" />
        </NextIntlClientProvider>
        <VercelTelemetry />
      </body>
    </html>
  );
}
