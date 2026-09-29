"use client";

import { useEffect, useRef, useState } from "react";

export type RecorderPhase =
  "ready" | "recording" | "paused" | "review" | "unsupported" | "denied";

/** What MediaRecorder can make here, best first: Opus in WebM (Chrome,
 *  Firefox, Edge), AAC in MP4 (Safari). */
const FORMATS = [
  { mime: "audio/webm;codecs=opus", type: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", type: "audio/mp4", ext: "m4a" },
  { mime: "audio/webm", type: "audio/webm", ext: "webm" },
] as const;

export interface RecordedTake {
  file: File;
  url: string;
  durationMs: number;
  cues: { block: string; ms: number }[];
}

/**
 * A voice recording of a story, block by block: the microphone through
 * MediaRecorder, a live level (written straight to `levelRef`'s scale so a
 * silent mic is noticed at once, without re-rendering 60× a second), the
 * time recorded (pauses excluded — MediaRecorder leaves them out too) and
 * the cues: `next()` marks where the next block starts. The stored type is
 * the base type without `;codecs=` — what the upload rules allow.
 */
export function useVoiceRecorder(blocks: string[]) {
  const [phase, setPhase] = useState<RecorderPhase>("ready");
  const [blockIndex, setBlockIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<RecordedTake | null>(null);
  const levelRef = useRef<HTMLSpanElement>(null);
  const live = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    audio: AudioContext;
    chunks: Blob[];
    cues: { block: string; ms: number }[];
    recordedMs: number;
    since: number | null;
    frame: number;
  } | null>(null);

  const now = () => {
    const l = live.current;
    if (!l) return 0;
    return l.recordedMs + (l.since === null ? 0 : performance.now() - l.since);
  };

  const release = () => {
    const l = live.current;
    if (!l) return;
    cancelAnimationFrame(l.frame);
    l.stream.getTracks().forEach((track) => track.stop());
    void l.audio.close();
    live.current = null;
  };

  const start = async () => {
    const format = FORMATS.find((f) =>
      typeof MediaRecorder !== "undefined"
        ? MediaRecorder.isTypeSupported(f.mime)
        : false,
    );
    if (!format || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setPhase("denied");
      return;
    }
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mime,
      audioBitsPerSecond: 48_000,
    });
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 512;
    audio.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const l = {
      recorder,
      stream,
      audio,
      chunks: [] as Blob[],
      cues: [{ block: blocks[0], ms: 0 }],
      recordedMs: 0,
      since: performance.now(),
      frame: 0,
    };
    live.current = l;
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples)
        peak = Math.max(peak, Math.abs(sample - 128));
      levelRef.current?.style.setProperty(
        "--level",
        String(Math.min(1, peak / 64)),
      );
      setSeconds(Math.floor(now() / 1000));
      l.frame = requestAnimationFrame(tick);
    };
    l.frame = requestAnimationFrame(tick);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) l.chunks.push(event.data);
    };
    recorder.onstop = () => {
      const durationMs = Math.round(l.recordedMs);
      const blob = new Blob(l.chunks, { type: format.type });
      const file = new File([blob], `narration.${format.ext}`, {
        type: format.type,
      });
      setTake({
        file,
        url: URL.createObjectURL(blob),
        durationMs,
        cues: l.cues,
      });
      setPhase("review");
      release();
    };
    recorder.start(1000);
    setBlockIndex(0);
    setSeconds(0);
    setPhase("recording");
  };

  const next = () => {
    const l = live.current;
    if (!l || blockIndex >= blocks.length - 1) return;
    const at = blockIndex + 1;
    l.cues.push({ block: blocks[at], ms: Math.round(now()) });
    setBlockIndex(at);
  };

  const pause = () => {
    const l = live.current;
    if (!l || l.since === null) return;
    l.recordedMs += performance.now() - l.since;
    l.since = null;
    l.recorder.pause();
    setPhase("paused");
  };

  const resume = () => {
    const l = live.current;
    if (!l || l.since !== null) return;
    l.since = performance.now();
    l.recorder.resume();
    setPhase("recording");
  };

  const finish = () => {
    const l = live.current;
    if (!l) return;
    if (l.since !== null) l.recordedMs += performance.now() - l.since;
    l.since = null;
    l.recorder.stop();
  };

  const reset = () => {
    if (live.current) {
      live.current.recorder.onstop = null;
      if (live.current.recorder.state !== "inactive")
        live.current.recorder.stop();
      release();
    }
    if (take) URL.revokeObjectURL(take.url);
    setTake(null);
    setBlockIndex(0);
    setSeconds(0);
    setPhase("ready");
  };

  // Closing the recorder mid-take lets go of the microphone.
  useEffect(() => {
    const ref = live;
    return () => {
      const l = ref.current;
      if (!l) return;
      l.recorder.onstop = null;
      if (l.recorder.state !== "inactive") l.recorder.stop();
      cancelAnimationFrame(l.frame);
      l.stream.getTracks().forEach((track) => track.stop());
      void l.audio.close();
      ref.current = null;
    };
  }, []);

  return {
    phase,
    blockIndex,
    seconds,
    take,
    levelRef,
    start,
    next,
    pause,
    resume,
    finish,
    reset,
  };
}
