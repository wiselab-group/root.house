/**
 * One line of truth for a batch upload's overall progress (see
 * BatchUploadSummary) — weighted by file size, not by count, so one 14MB
 * photo still uploading doesn't read as "almost done" next to three 200KB
 * ones that finished instantly. Failed files drop out of the total: they
 * will never reach 100%.
 */
export interface BatchItem {
  sizeBytes: number;
  /** 0–1. */
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
}

export interface BatchProgress {
  /** 0–1, over the files that are uploading or done. */
  fraction: number;
  done: number;
  failed: number;
  /** Files in the batch that have started (uploading/done/error). */
  started: number;
  isActive: boolean;
}

export function batchProgress(items: BatchItem[]): BatchProgress {
  const counted = items.filter(
    (item) => item.status === "uploading" || item.status === "done",
  );
  const totalBytes = counted.reduce((sum, item) => sum + item.sizeBytes, 0);
  const sentBytes = counted.reduce(
    (sum, item) =>
      sum + item.sizeBytes * (item.status === "done" ? 1 : item.progress),
    0,
  );
  return {
    fraction: totalBytes > 0 ? sentBytes / totalBytes : 0,
    done: items.filter((item) => item.status === "done").length,
    failed: items.filter((item) => item.status === "error").length,
    started: items.filter((item) => item.status !== "queued").length,
    isActive: items.some((item) => item.status === "uploading"),
  };
}
