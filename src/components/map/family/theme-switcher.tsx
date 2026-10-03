"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, LayersIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAP_THEMES, type MapThemeId } from "@/lib/map-theme/map-theme";
import { cn } from "@/lib/utils";

/** A theme's own colours, drawn from its own tokens — the swatch can't
 *  drift from what the map will actually look like. */
function Swatch({ id }: { id: MapThemeId }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/15",
        MAP_THEMES[id].className,
      )}
    >
      <span className="flex-1 bg-(--map-land)" />
      <span className="w-3 bg-(--map-water)" />
      <span className="absolute inset-x-1.5 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-(--map-route)" />
    </span>
  );
}

/** «Вид карты» — how the basemap looks; the family on it never changes. */
export function ThemeSwitcher({
  value,
  onChange,
}: {
  value: MapThemeId;
  onChange: (theme: MapThemeId) => void;
}) {
  const t = useTranslations("familyMap");
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("themeLabel")}
        className="absolute top-3 right-3 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full border border-glass-edge bg-background/75 text-foreground shadow-lg shadow-black/30 backdrop-blur-xl transition-transform duration-base ease-(--ease-spring) outline-none hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <LayersIcon className="size-5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <p className="px-2 pt-1 pb-2 text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {t("themeLabel")}
        </p>
        <ul className="flex flex-col gap-0.5">
          {(Object.keys(MAP_THEMES) as MapThemeId[]).map((id) => (
            <li key={id}>
              <button
                type="button"
                aria-pressed={value === id}
                onClick={() => onChange(id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 text-left transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/8 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/12"
              >
                <Swatch id={id} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {t(`themes.${id}.name`)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t(`themes.${id}.hint`)}
                  </span>
                </span>
                {value === id && (
                  <CheckIcon
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
