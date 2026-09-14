import { BrandMark } from "@/components/brand-mark";

/**
 * Brand mark shown above the login/register/invite/share card — centers the
 * shared BrandMark so auth screens read as "Root house" first and "sign in"
 * second. Scaled up 1.5x (transform, not a layout property) since this is
 * the hero moment for the mark, unlike its compact use in AppHeader. The
 * tagline underneath is new — a bare wordmark over a form read as
 * placeholder-y; one warm sentence sets the "family archive, not SaaS tool"
 * tone before any UI chrome (CLAUDE.md § WHY) at the one moment the product
 * has a visitor's full attention with nothing else on screen.
 */
export function AuthBrand() {
  return (
    <div className="mb-10 flex animate-content-enter flex-col items-center gap-3 text-center">
      <BrandMark className="scale-150" />
      <p className="text-sm text-muted-foreground">
        Семейный архив, который остаётся с вами
      </p>
    </div>
  );
}
