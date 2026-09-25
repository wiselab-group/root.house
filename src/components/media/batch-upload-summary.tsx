import { pluralizeRu } from "@/domain/shared/pluralize-ru";
import { batchProgress, type BatchItem } from "./batch-upload-progress";
import { UploadProgressBar } from "./upload-progress-bar";

/**
 * The batch's overall progress under an upload panel (user's pick, variant
 * D): "Загружаем 3 фото · 25 МБ" with a percentage and one full-width bar,
 * so "how much longer?" has an answer at a glance — the per-tile bars only
 * say which file is where. Then "Загружено 3 из 3" once the batch settles.
 * Renders nothing until something has started.
 */
export function BatchUploadSummary({
  items,
  forms,
}: {
  items: BatchItem[];
  /** The noun's three Russian plural forms — e.g. фото/фото/фото. */
  forms: [one: string, few: string, many: string];
}) {
  const { fraction, done, failed, started, isActive } = batchProgress(items);
  if (started === 0) return null;

  const noun = (count: number) => `${count} ${pluralizeRu(count, ...forms)}`;
  const totalMb =
    items
      .filter((item) => item.status !== "queued")
      .reduce((sum, item) => sum + item.sizeBytes, 0) /
    1024 ** 2;
  const percent = Math.round(fraction * 100);

  const label = isActive
    ? `Загружаем ${noun(started - failed)}${totalMb >= 1 ? ` · ${totalMb.toFixed(1).replace(".", ",")} МБ` : ""}`
    : `Загружено ${done} из ${started}${failed > 0 ? `, ${failed} с ошибкой` : ""}`;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-foreground/80">{label}</span>
        {isActive && (
          <span className="text-muted-foreground tabular-nums">
            {fraction < 0.9 ? `${percent}%` : "Сохраняем…"}
          </span>
        )}
      </div>
      {isActive && (
        <UploadProgressBar
          value={fraction}
          label="Загрузка всех файлов"
          className="h-1.5"
        />
      )}
    </div>
  );
}
