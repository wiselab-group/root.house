"use client";

import { useTranslations } from "next-intl";
import { VolumeXIcon } from "lucide-react";

/**
 * Nothing was heard — most likely a muted tab or device, which no web API
 * reports (see useSpeechNarration). A bubble over the player capsule, its
 * tail on the capsule's ▶ — the button to press once the sound is back on
 * (user choice 2026-09-29: by the player, not a toast that fades while
 * they look for the mute switch; not inside the capsule, which it
 * crowded). Stays until ▶ or ✕.
 */
export function PlayerUnheardHint() {
  const t = useTranslations("stories");
  return (
    // Same width as the capsule, so the tail lines up with its ▶ (p-1.5 +
    // half of the size-11 button = 1.75rem from the left).
    <div className="flex w-full max-w-xl">
      {/* Solid terracotta, the ▶ button's own colour: in the page's dark
          glass a glass bubble blended into the photos behind it (user
          screenshot 2026-09-29); terracotta = "act here", and the bubble
          and the button it points at read as one. */}
      <p
        role="status"
        className="pointer-events-auto relative flex max-w-sm animate-in items-center gap-2.5 rounded-2xl bg-primary px-3.5 py-2.5 text-sm leading-snug text-pretty text-primary-foreground shadow-xl shadow-black/40 duration-base ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none [&>svg]:size-5 [&>svg]:shrink-0"
      >
        <VolumeXIcon aria-hidden="true" />
        <span>
          {t.rich("listenUnheard", {
            b: (chunks) => <b className="font-semibold">{chunks}</b>,
          })}
        </span>
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-5.5 size-3 rotate-45 bg-primary"
        />
      </p>
    </div>
  );
}
