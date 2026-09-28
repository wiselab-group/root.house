"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckIcon, Link2OffIcon } from "lucide-react";
import { SAFE_LINK } from "@/domain/story/story-doc";
import { MenuButton } from "./menu-parts";

/** A bare «example.org» becomes https://example.org; anything with its own
 *  scheme must be one a story may link to (http(s)/mailto). */
function normalizeHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (SAFE_LINK.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return `https://${trimmed}`;
}

/** StoryBubbleMenu's address field for a link: Enter applies, Escape goes
 *  back to the formatting buttons. */
export function LinkForm({
  initial,
  onApply,
  onRemove,
  onCancel,
}: {
  initial: string;
  onApply: (href: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("storyForm");
  const [value, setValue] = useState(initial);
  const href = normalizeHref(value);

  return (
    <div className="flex items-center gap-0.5 pl-3">
      <input
        // The field replaces the buttons the user just pressed.
        autoFocus
        type="url"
        inputMode="url"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (href) onApply(href);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder={t("linkPlaceholder")}
        aria-label={t("link")}
        aria-invalid={value.trim() !== "" && !href ? true : undefined}
        className="h-9 w-52 bg-transparent text-sm outline-none placeholder:text-muted-foreground aria-invalid:text-destructive sm:w-64"
      />
      <MenuButton label={t("linkApply")} onClick={() => href && onApply(href)}>
        <CheckIcon />
      </MenuButton>
      {initial && (
        <MenuButton label={t("linkRemove")} onClick={onRemove}>
          <Link2OffIcon />
        </MenuButton>
      )}
    </div>
  );
}
