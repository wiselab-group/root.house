"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonDateFields } from "@/components/forms/person-date-fields";
import { cn } from "@/lib/utils";

const option =
  "flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-center text-sm outline-none transition-colors duration-fast has-checked:bg-background has-checked:font-medium has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-ring";

/**
 * A profile voice's details, as plain form fields (read by
 * addPersonVoiceAction from FormData): whose voice it is — the person's
 * own, or someone telling about them, then who — a title, and when it was
 * recorded (`recorded*`, the same partial-date fields as everywhere).
 */
export function VoiceDetailsFields() {
  const t = useTranslations("voice");
  const [speaker, setSpeaker] = useState<"self" | "narrator">("self");

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">
          {t("speakerLabel")}
        </legend>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {(["self", "narrator"] as const).map((value) => (
            <label key={value} className={option}>
              <input
                type="radio"
                name="speaker"
                value={value}
                checked={speaker === value}
                onChange={() => setSpeaker(value)}
                className="sr-only"
              />
              {value === "self" ? t("speakerSelf") : t("speakerNarrator")}
            </label>
          ))}
        </div>
      </fieldset>
      <div
        className={cn(
          "flex flex-col gap-1.5",
          speaker !== "narrator" && "hidden",
        )}
      >
        <Label htmlFor="voice-narrator">{t("narratorName")}</Label>
        <Input
          id="voice-narrator"
          name="narratorName"
          maxLength={80}
          required={speaker === "narrator"}
          placeholder={t("narratorPlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="voice-title">
          {t("titleLabel")}
          <span className="font-normal text-muted-foreground">
            {" "}
            · {t("titleOptional")}
          </span>
        </Label>
        <Input
          id="voice-title"
          name="title"
          maxLength={120}
          placeholder={t("titlePlaceholder")}
        />
      </div>
      <PersonDateFields prefix="recorded" legend={t("dateLegend")} />
    </div>
  );
}
