import { HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared "Root house" brand mark — accent-tinted house glyph plus wordmark
 * in the heading typeface. Used on the auth screens (AuthBrand) and in the
 * authenticated app header so both read as the same product identity.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <HomeIcon className="size-4.5" />
      </span>
      <span className="font-heading text-xl font-medium tracking-tight text-foreground">
        Root house
      </span>
    </span>
  );
}
