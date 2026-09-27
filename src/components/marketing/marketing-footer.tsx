import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";

/** Minimal closing footer for the public marketing page — brand mark and a
 *  copyright line. Log in / Register live in the header; no need to
 *  repeat them here. */
export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <BrandMark />
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <span className="text-sm text-muted-foreground">
            &copy; {year} Root house
          </span>
        </div>
      </div>
    </footer>
  );
}
