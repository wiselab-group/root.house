import type { LucideIcon } from "lucide-react";

export function FeatureGridItem({
  icon: Icon,
  label,
  description,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <Icon
        className="size-5 text-primary"
        aria-hidden="true"
        strokeWidth={1.75}
      />
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  );
}
