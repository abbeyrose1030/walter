"use client";

import { uploadPresigned } from "@vercel/blob/client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackingAudioPlayer } from "@/lib/backing-audio";
import { APP_NAME, INSTRUCTOR_NAME, STUDENT_NAME } from "@/lib/branding";
import { readApiError } from "@/lib/read-api-error";
import { hasHeadphoneLikeOutput } from "@/lib/built-in-mic";
import { restoreIOSPlaybackSession, setIOSPlayAndRecord } from "@/lib/ios-audio-session";
import { PracticeRecorder } from "@/lib/recorder";

type Props = {
  songId: string;
  songTitle: string;
  trackUrl: string;
};

type Phase = "ready" | "countdown" | "recording" | "uploading" | "done" | "error";

export function PracticeSession({ songId, songTitle, trackUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<BackingAudioPlayer | null>(null);
  const recorderRef = useRef<PracticeRecorder | null>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [message, setMessage] = useState("");
  const [loadingTrack, setLoadingTrack] = useState(true);
  const [headphonesDetected, setHeadphonesDetected] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const player = new BackingAudioPlayer();
    playerRef.current = player;

    (async () => {
      try {
        await player.loadFromUrl(trackUrl);
      } catch {
        setMessage(
          `Could not load the song. Ask ${INSTRUCTOR_NAME} to check the upload.`,
        );
        setPhase("error");
      } finally {
        setLoadingTrack(false);
      }
    })();

    return () => {
      player.dispose();
      recorderRef.current?.cancel();
    };
  }, [trackUrl]);

  const attachPreview = useCallback((stream: MediaStream | null) => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, []);

  const startSession = async () => {
    setMessage("");
    const player = playerRef.current;
    if (!player) return;

    try {
      await player.unlock();
      setIOSPlayAndRecord();
      setHeadphonesDetected(await hasHeadphoneLikeOutput());

      const recorder = new PracticeRecorder();
      recorderRef.current = recorder;

      // Open mic/camera first, then start backing (iOS Safari routing workaround).
      setPhase("countdown");
      setCountdown(3);
      await recorder.prepare();
      attachPreview(recorder.previewStream);

      await player.play(0);
      player.setVolume(1);

      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 800));
      }

      await recorder.startRecording();
      setPhase("recording");
    } catch (err) {
      console.error(err);
      playerRef.current?.stop();
      restoreIOSPlaybackSession();
      setMessage(
        `Camera or mic blocked. Allow ${APP_NAME} to use camera & microphone in Settings.`,
      );
      setPhase("error");
    }
  };

  const stopAndUpload = async () => {
    const recorder = recorderRef.current;
    const player = playerRef.current;
    if (!recorder) return;

    setPhase("uploading");
    player?.stop();
    attachPreview(null);

    try {
      const { blob, mimeType } = await recorder.stop();
      recorderRef.current = null;
      restoreIOSPlaybackSession();

      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const id = crypto.randomUUID();
      const file = new File(
        [blob],
        `${STUDENT_NAME.toLowerCase()}-practice.${ext}`,
        { type: mimeType },
      );

      const uploaded = await uploadPresigned(`videos/${id}.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/videos/upload",
        clientPayload: JSON.stringify({
          songId,
          songTitle,
          studentName: STUDENT_NAME,
        }),
        multipart: file.size > 4 * 1024 * 1024,
        contentType: mimeType,
      });

      const res = await fetch("/api/videos/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          songId,
          songTitle,
          studentName: STUDENT_NAME,
          url: uploaded.url,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Upload failed"));
      }
      setPhase("done");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  };

  const cancel = () => {
    playerRef.current?.stop();
    recorderRef.current?.cancel();
    attachPreview(null);
    restoreIOSPlaybackSession();
    setPhase("ready");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          ← Songs
        </Link>
        <span className="text-right text-sm font-medium opacity-80">{songTitle}</span>
      </header>

      <div className="relative mb-4 overflow-hidden rounded-3xl border-4 border-[var(--walter-coral)] bg-black shadow-lg">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-[3/4] w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-8xl font-bold text-[var(--walter-sun)]">
              {countdown}
            </span>
          </div>
        )}
        {phase === "recording" && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-[var(--walter-coral)] px-3 py-1 text-sm font-bold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            REC
          </div>
        )}
      </div>

      <div className="mb-4 rounded-2xl border-2 border-[var(--walter-sky)] bg-white px-4 py-3 text-center text-sm leading-snug">
        <p className="font-bold text-[var(--walter-ink)]">
          🎧 Headphones on (always)
        </p>
        <p className="mt-1 opacity-90">
          The song plays in your <strong>headphones</strong>. Your{" "}
          <strong>iPad microphone</strong> records guitar — not the headphone mic,
          and not the speaker track in the upload.
        </p>
        {headphonesDetected === false && (
          <p className="mt-2 text-xs font-semibold text-[var(--walter-coral)]">
            Headphones not detected yet — plug them in before you start.
          </p>
        )}
      </div>

      {message && (
        <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-center text-sm text-[var(--walter-coral)]">
          {message}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {phase === "ready" && (
          <button
            type="button"
            disabled={loadingTrack}
            onClick={() => void startSession()}
            className="rounded-2xl bg-[var(--walter-sky)] px-6 py-5 text-xl font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {loadingTrack ? "Loading song…" : `Start with ${APP_NAME} 🎸`}
          </button>
        )}

        {phase === "recording" && (
          <button
            type="button"
            onClick={() => void stopAndUpload()}
            className="rounded-2xl bg-[var(--walter-coral)] px-6 py-5 text-xl font-bold text-white shadow-md active:scale-[0.98]"
          >
            Done! Send to {INSTRUCTOR_NAME} ✨
          </button>
        )}

        {(phase === "countdown" || phase === "recording") && (
          <button
            type="button"
            onClick={cancel}
            className="rounded-2xl bg-white px-6 py-3 text-base font-semibold shadow-sm"
          >
            Cancel
          </button>
        )}

        {phase === "uploading" && (
          <p className="py-4 text-center text-lg font-semibold">Uploading…</p>
        )}

        {phase === "done" && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-xl font-bold text-[var(--walter-grape)]">
              Nice! {INSTRUCTOR_NAME} can watch it now. 🌟
            </p>
            <Link
              href="/"
              className="rounded-2xl bg-[var(--walter-sun)] px-6 py-4 text-center text-lg font-bold shadow-md"
            >
              Pick another song
            </Link>
          </div>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={() => {
              setPhase("ready");
              setMessage("");
            }}
            className="rounded-2xl bg-[var(--walter-sun)] px-6 py-4 text-lg font-bold"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
