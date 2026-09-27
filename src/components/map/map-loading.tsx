import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** «Загружаем карту…» placeholder shared by the lazy map loaders and
 *  MapView's own style fetch. */
export function MapLoading({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground",
        className,
      )}
    >
      {t("loadingMap")}
    </div>
  );
}
