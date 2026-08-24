import { BrandMark } from "@/components/brand-mark";

/**
 * Brand mark shown above the login/register card — centers the shared
 * BrandMark so auth screens read as "Root house" first and "sign in" second.
 */
export function AuthBrand() {
  return (
    <div className="mb-6 flex items-center justify-center">
      <BrandMark />
    </div>
  );
}
