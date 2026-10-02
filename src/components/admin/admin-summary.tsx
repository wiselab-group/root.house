import { getFormatter, getTranslations } from "next-intl/server";
import type { AdminSummary as Summary } from "@/domain/admin/admin.repository";
import { formatBytes } from "./format-bytes";

/** Headline numbers as a tile grid — counts only, see admin.repository. */
export async function AdminSummary({ summary }: { summary: Summary }) {
  const t = await getTranslations("admin.summary");
  const format = await getFormatter();
  const n = (value: number) => format.number(value);

  const tiles = [
    { label: t("users"), value: n(summary.users) },
    { label: t("newUsers7d"), value: n(summary.newUsers7d) },
    { label: t("active7d"), value: n(summary.active7d) },
    { label: t("active30d"), value: n(summary.active30d) },
    { label: t("families"), value: n(summary.families) },
    { label: t("persons"), value: n(summary.persons) },
    { label: t("stories"), value: n(summary.stories) },
    {
      label: t("storage"),
      value: formatBytes(summary.storageBytes, format.number),
      hint: t("storageHint", { count: summary.mediaFiles }),
    },
  ];

  return (
    <section aria-label={t("label")}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-card/60 p-4"
          >
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="font-heading text-2xl font-medium tabular-nums">
              {tile.value}
            </dd>
            {tile.hint && (
              <dd className="text-xs text-muted-foreground tabular-nums">
                {tile.hint}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
