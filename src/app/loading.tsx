import { BrandMark } from "@/components/brand-mark";

/**
 * Top-level fallback for the segment above (app)/(auth) — covers the brief
 * moment on a hard/full navigation before either group's own layout (and
 * more specific loading.tsx, where one exists) takes over. Minimal by
 * design: this is a rare, short-lived flash, not a page of its own.
 */
export default function RootLoading() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <BrandMark className="opacity-60" />
    </main>
  );
}
