"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";

/** Header shortcut to /admin, rendered only for admins (AppHeader's
 *  isAdmin). Icon-only on desktop; `withLabel` in the phone menu. */
export function AdminLink({
  withLabel = false,
  onNavigate,
}: {
  withLabel?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin");
  const active = usePathname().startsWith("/admin");
  return (
    <LinkButton
      href="/admin"
      variant="ghost"
      size={withLabel ? "sm" : "icon"}
      aria-label={withLabel ? undefined : t("navLabel")}
      title={withLabel ? undefined : t("navLabel")}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(active && "text-primary")}
    >
      <ShieldIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      {withLabel && t("navLabel")}
    </LinkButton>
  );
}
