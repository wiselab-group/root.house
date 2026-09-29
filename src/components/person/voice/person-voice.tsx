"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MicIcon } from "lucide-react";
import { toast } from "sonner";
import type { PersonVoiceView } from "@/domain/person-voice/person-voice.service";
import type { VoiceClipSource } from "@/components/story/listen/listening-store";
import { glassPill } from "@/components/hero/glass";
import {
  featurePersonVoiceAction,
  removePersonVoiceAction,
} from "@/actions/person-voice.actions";
import { VoiceCapsule } from "./voice-capsule";
import { VoiceList } from "./voice-list";
import { AddVoiceDialog } from "./add-voice-dialog";
import { useVoiceWording } from "./voice-wording";

export interface PersonVoiceProps {
  voices: PersonVoiceView[];
  familyId: string;
  personId: string;
  personName: string;
  profilePath: string;
  /** The portrait, thumb size — the lock screen's cover. */
  artwork: string | null;
  viewer: { userId: string; canContribute: boolean; canEditAll: boolean };
}

/**
 * The voice in the Person Profile hero (user pick 2026-09-29: mocks «A»
 * and «B» combined): the main recording as a capsule under the name, and
 * «Ещё N записей» opening the rest as a list with waveforms. Whoever may
 * add media gets «Добавить голос» when there's none yet, and the list's
 * «Добавить запись». Plays through the family-wide player.
 */
export function PersonVoice({
  voices,
  familyId,
  personId,
  personName,
  profilePath,
  artwork,
  viewer,
}: PersonVoiceProps) {
  const t = useTranslations("voice");
  const wording = useVoiceWording();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, startBusy] = useTransition();

  if (voices.length === 0 && !viewer.canContribute) return null;

  const items = voices.map((voice) => {
    const words = wording(voice);
    const source: VoiceClipSource = {
      kind: "voice",
      voiceId: voice.id,
      mediaId: voice.mediaId,
      familyId,
      title: words.title,
      personName,
      subtitle: [words.date, words.length].filter(Boolean).join(" · "),
      href: profilePath,
      durationMs: voice.durationMs,
      artwork,
    };
    return { voice, words, source };
  });

  const run = (action: typeof removePersonVoiceAction, voiceId: string) =>
    startBusy(async () => {
      const result = await action(familyId, profilePath, voiceId);
      if ("error" in result) toast.error(result.error);
      else router.refresh();
    });

  const dialog = viewer.canContribute && (
    <AddVoiceDialog
      open={adding}
      onOpenChange={setAdding}
      familyId={familyId}
      personId={personId}
      profilePath={profilePath}
    />
  );

  const [main] = items;
  if (!main) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${glassPill} w-fit border-dashed`}
        >
          <MicIcon aria-hidden="true" className="text-primary" />
          {t("add")}
        </button>
        {dialog}
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <VoiceCapsule source={main.source} {...main.words} />
      {(items.length > 1 || viewer.canContribute) && (
        <VoiceList
          items={items.map(({ voice, words, source }, index) => ({
            key: voice.id,
            source,
            ...words,
            peaks: voice.peaks,
            isMain: index === 0,
            onFeature:
              viewer.canEditAll && index > 0
                ? () => run(featurePersonVoiceAction, voice.id)
                : null,
            onDelete:
              viewer.canEditAll || voice.addedBy === viewer.userId
                ? () => run(removePersonVoiceAction, voice.id)
                : null,
          }))}
          busy={busy}
          onAdd={viewer.canContribute ? () => setAdding(true) : null}
        />
      )}
      {dialog}
    </div>
  );
}
