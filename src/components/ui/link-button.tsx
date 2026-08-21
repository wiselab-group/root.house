import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "./button";

/**
 * A Button that navigates via next/link instead of triggering an action —
 * renders an <a>, not a <button>, so nativeButton={false} is required (Base
 * UI's Button assumes a real <button> unless told otherwise; omitting this
 * throws "expected a native <button>" at runtime). Use this instead of
 * `<Button render={<Link .../>}>` at every call site.
 */
export function LinkButton({
  href,
  ...buttonProps
}: ComponentProps<typeof Button> & { href: ComponentProps<typeof Link>["href"] }) {
  return <Button nativeButton={false} render={<Link href={href} />} {...buttonProps} />;
}
