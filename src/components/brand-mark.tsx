import { HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared "Root house" brand mark — accent-tinted house glyph plus wordmark
 * in the heading typeface. Used on the auth screens (AuthBrand) and in the
 * authenticated app header so both read as the same product identity.
 * `glyphClassName`/`iconClassName` let a call site resize just the icon
 * badge (e.g. AppHeader growing it to match its 44px mobile menu toggle
 * below md) without affecting the mark's other, more common uses.
 */
export function BrandMark({
  className,
  glyphClassName,
  iconClassName,
}: {
  className?: string;
  glyphClassName?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary",
          glyphClassName,
        )}
      >
        <HomeIcon className={cn("size-4.5", iconClassName)} />
      </span>
      <span className="font-heading text-xl font-medium tracking-tight text-foreground">
        Root house
      </span>
    </span>
  );
}
