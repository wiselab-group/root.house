"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVoiceRecorder } from "@/components/story/listen/use-voice-recorder";
import { addPersonVoiceAction } from "@/actions/person-voice.actions";
import { uploadToStorage } from "@/lib/direct-upload";
import { measureVoice } from "@/lib/voice-audio";
import { useUploadErrorMessage } from "@/hooks/use-upload-error-message";
import { VoiceTakePicker } from "./voice-take-picker";
import { VoiceDetailsFields } from "./voice-details-fields";

const SCRIPT = ["title"];

/**
 * Adding a voice to a profile: record it here or pick a file, say whose
 * voice it is and when it was recorded, save. The browser measures the
 * length and waveform (lib/voice-audio.ts), puts the audio straight into
 * private storage (kind "audio"), then addPersonVoiceAction keeps it.
 */
export function AddVoiceDialog({
  open,
  onOpenChange,
  familyId,
  personId,
  profilePath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  personId: string;
  profilePath: string;
}) {
  const t = useTranslations("voice");
  const tc = useTranslations("common");
  const uploadError = useUploadErrorMessage();
  const router = useRouter();
  const recorder = useVoiceRecorder(SCRIPT);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const take = picked ?? recorder.take;

  const clear = () => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
    recorder.reset();
    setError(null);
  };
  const close = () => {
    clear();
    onOpenChange(false);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!take) return;
    const details = new FormData(event.currentTarget);
    setError(null);
    setSaving(0);
    try {
      const measured = await measureVoice(
        take.file,
        picked ? undefined : recorder.take?.durationMs,
      );
      if (!measured) throw new Error(t("badFile"));
      const storageKey = await uploadToStorage({
        familyId,
        kind: "audio",
        file: take.file,
        onProgress: (f) => setSaving(Math.round(f * 100)),
      });
      const result = await addPersonVoiceAction(
        familyId,
        profilePath,
        { personId, storageKey, ...measured },
        details,
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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <form
          onSubmit={(event) => void save(event)}
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-normal">
              {t("addTitle")}
            </DialogTitle>
            <DialogDescription>{t("addHint")}</DialogDescription>
          </DialogHeader>
          <VoiceTakePicker
            phase={recorder.phase}
            seconds={recorder.seconds}
            levelRef={recorder.levelRef}
            onStart={() => void recorder.start()}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onFinish={recorder.finish}
            take={take}
            onPick={(file) => {
              setError(null);
              setPicked({ file, url: URL.createObjectURL(file) });
            }}
            onClear={clear}
          />
          {take && <VoiceDetailsFields />}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={saving !== null}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={!take || saving !== null}>
              {saving === null ? t("save") : t("saving", { percent: saving })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
