import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Marks a landing demo as something Root house doesn't do yet — the page
 * shows these ideas, but must never pass them off as shipped features
 * (structuring a recording, asking the family, exporting the archive, the
 * year-by-year map path).
 */
export function SoonBadge({ className }: { className?: string }) {
  const t = useTranslations("landing");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-dashed border-muted-foreground/50 px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
    >
      {t("soon")}
    </span>
  );
}

/** One-line note under a demo: what already works vs. what's coming. */
export function DemoNote({
  children,
  soon = false,
  className,
}: {
  children: string;
  soon?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      {soon ? (
        <SoonBadge className="mt-px" />
      ) : (
        <span
          aria-hidden="true"
          className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-tree-accent"
        />
      )}
      <span>{children}</span>
    </p>
  );
}
