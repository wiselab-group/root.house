import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";

// `subsets` must include "cyrillic" — the entire UI is in Russian; Geist's
// Google Fonts variant does support it, it was just never requested before.
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

export const metadata: Metadata = {
  title: "Root house",
  description:
    "Семейный архив: родословная, дерево, профили, события и фотографии одной семьи.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
