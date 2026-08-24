import { BrandMark } from "@/components/brand-mark";

/**
 * Brand mark shown above the login/register card — centers the shared
 * BrandMark so auth screens read as "Root house" first and "sign in" second.
 * Scaled up 1.5x (transform, not a layout property) since this is the
 * hero moment for the mark, unlike its compact use in AppHeader.
 */
export function AuthBrand() {
  return (
    <div className="mb-10 flex items-center justify-center">
      <BrandMark className="scale-150" />
    </div>
  );
}
