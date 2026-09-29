"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Trash2Icon, XIcon } from "lucide-react";
import { glassIconButton } from "@/components/hero/glass";
import { uploadToStorage } from "@/lib/direct-upload";
import { useUploadErrorMessage } from "@/hooks/use-upload-error-message";
import {
  removeStoryNarrationAction,
  saveStoryNarrationAction,
} from "@/actions/story-narration.actions";
import { useNarration } from "./narration-context";
import { RecorderControls } from "./recorder-controls";
import { RecorderScript, type ScriptBlock } from "./recorder-script";
import { useVoiceRecorder } from "./use-voice-recorder";

export interface StoryRecordTarget {
  familyId: string;
  storyId: string;
  /** The story page, to refresh once the recording is kept. */
  storyPath: string;
  hasRecording: boolean;
  /** The story's text changed after its recording was made. */
  staleRecording: boolean;
}

/**
 * Recording a story in a family member's own voice (no AI — CLAUDE.md
 * § STORIES): a full-screen teleprompter of the story's text, read aloud
 * block by block, «Дальше» at each new paragraph (those become the cues
 * that light up the text while listening). Listen back, then save — the
 * audio goes straight to private storage (kind "audio") and the action
 * keeps it as the story's recording, replacing an earlier one.
 */
export function StoryRecorder({
  target,
  open,
  onOpenChange,
}: {
  target: StoryRecordTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("stories");
  const tc = useTranslations("common");
  const uploadError = useUploadErrorMessage();
  const router = useRouter();
  const narration = useNarration();
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  const blocks: ScriptBlock[] = [];
  for (const phrase of narration?.narration.phrases ?? []) {
    const last = blocks[blocks.length - 1];
    if (last?.block === phrase.block) last.text += ` ${phrase.text}`;
    else
      blocks.push({
        block: phrase.block,
        text: phrase.text,
        heading:
          phrase.block === "title" ||
          narration?.narration.chapters.some((c) => c.title === phrase.text) ===
            true,
      });
  }
  const recorder = useVoiceRecorder(blocks.map((b) => b.block));

  const close = () => {
    recorder.reset();
    setError(null);
    onOpenChange(false);
  };

  const save = async () => {
    const take = recorder.take;
    if (!take) return;
    setError(null);
    setSaving(0);
    try {
      const storageKey = await uploadToStorage({
        familyId: target.familyId,
        kind: "audio",
        file: take.file,
        onProgress: (f) => setSaving(Math.round(f * 100)),
      });
      const result = await saveStoryNarrationAction(
        target.familyId,
        target.storyPath,
        {
          storyId: target.storyId,
          storageKey,
          durationMs: take.durationMs,
          cues: take.cues,
        },
      );
      if ("error" in result) throw new Error(result.error);
      close();
      router.refresh();
    } catch (caught) {
      setError(uploadError(caught));
    } finally {
      setSaving(null);
    }
  };

  const remove = () =>
    startRemoving(async () => {
      const result = await removeStoryNarrationAction(
        target.familyId,
        target.storyPath,
        target.storyId,
      );
      if ("error" in result) setError(result.error);
      else {
        close();
        router.refresh();
      }
    });

  const active = recorder.phase === "recording" || recorder.phase === "paused";
  const notice =
    recorder.phase === "denied"
      ? t("recordNoMic")
      : recorder.phase === "unsupported"
        ? t("recordUnsupported")
        : error;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-background duration-base data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col outline-none duration-base data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
          <header className="flex items-center gap-3 border-b border-glass-edge px-4 py-3 sm:px-6">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate font-heading text-xl">
              {t("recordTitle")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={
                <button
                  type="button"
                  aria-label={tc("close")}
                  className={glassIconButton}
                />
              }
            >
              <XIcon />
            </DialogPrimitive.Close>
          </header>
          <RecorderScript
            blocks={blocks}
            current={recorder.blockIndex}
            active={active}
          />
          <footer className="flex flex-col gap-3 border-t border-glass-edge px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {recorder.phase === "ready" && (
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <p className="text-pretty">{t("recordHint")}</p>
                {target.staleRecording && (
                  <p className="text-pretty text-foreground">
                    {t("recordStale")}
                  </p>
                )}
                {target.hasRecording && (
                  <p className="flex flex-wrap items-center justify-center gap-x-3">
                    {t("recordReplaceNote")}
                    <button
                      type="button"
                      onClick={remove}
                      disabled={removing}
                      className="inline-flex cursor-pointer items-center gap-1 text-destructive underline-offset-4 hover:underline disabled:opacity-50 [&_svg]:size-3.5"
                    >
                      <Trash2Icon aria-hidden="true" />
                      {t("recordDelete")}
                    </button>
                  </p>
                )}
              </div>
            )}
            {notice && (
              <p role="alert" className="text-center text-sm text-destructive">
                {notice}
              </p>
            )}
            <RecorderControls
              phase={recorder.phase}
              seconds={recorder.seconds}
              take={recorder.take}
              levelRef={recorder.levelRef}
              isLastBlock={recorder.blockIndex >= blocks.length - 1}
              saving={saving}
              onStart={() => void recorder.start()}
              onNext={recorder.next}
              onPause={recorder.pause}
              onResume={recorder.resume}
              onFinish={recorder.finish}
              onAgain={recorder.reset}
              onSave={() => void save()}
            />
          </footer>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
