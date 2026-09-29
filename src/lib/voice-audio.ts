import { VOICE_PEAK_COUNT } from "@/domain/person-voice/voice-input";

export interface MeasuredAudio {
  durationMs: number;
  /** VOICE_PEAK_COUNT values in 0–1, loudest bar = 1; null when the
   *  browser couldn't decode the file (it can often still play it). */
  peaks: number[] | null;
}

/** How long a file plays, from its metadata — for files the browser can
 *  play but not decode in full. Null when it can't tell. */
function metadataDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () =>
      done(Number.isFinite(audio.duration) ? audio.duration * 1000 : null),
    );
    audio.addEventListener("error", () => done(null));
    audio.src = url;
  });
}

/**
 * A voice file's length and waveform, measured in the browser before upload
 * (the server never decodes audio): the whole file is decoded once, split
 * into VOICE_PEAK_COUNT slices, and each slice's loudest sample becomes a
 * bar. Recordings from the in-app recorder already know their length
 * (`knownDurationMs` — MediaRecorder's WebM often reports none). Null when
 * the file isn't playable audio at all.
 */
export async function measureVoice(
  file: File,
  knownDurationMs?: number,
): Promise<MeasuredAudio | null> {
  let peaks: number[] | null = null;
  let durationMs = knownDurationMs ?? null;
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    void context.close();
    durationMs ??= buffer.duration * 1000;
    const channel = buffer.getChannelData(0);
    const slice = Math.max(1, Math.floor(channel.length / VOICE_PEAK_COUNT));
    const raw = Array.from({ length: VOICE_PEAK_COUNT }, (_, bar) => {
      let peak = 0;
      const end = Math.min(channel.length, (bar + 1) * slice);
      for (let i = bar * slice; i < end; i += 16) {
        peak = Math.max(peak, Math.abs(channel[i]));
      }
      return peak;
    });
    const loudest = Math.max(...raw);
    if (loudest > 0) peaks = raw.map((peak) => peak / loudest);
  } catch {
    // Not decodable here — the length may still come from metadata.
  }
  durationMs ??= await metadataDuration(file);
  return durationMs && durationMs > 0
    ? { durationMs: Math.round(durationMs), peaks }
    : null;
}
