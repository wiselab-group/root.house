import { HomeIcon } from "lucide-react";

/**
 * Brand mark shown above the login/register card — a small accent-tinted
 * house glyph (echoes the "Мои семьи" home icon in Breadcrumbs) plus the
 * wordmark in the heading typeface, so the auth screens read as "Root
 * house" first and "sign in" second, not the other way around.
 */
export function AuthBrand() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <HomeIcon className="size-4.5" />
      </span>
      <span className="font-heading text-xl font-medium tracking-tight text-foreground">
        Root house
      </span>
    </div>
  );
}
