"use client";

import { uploadPresigned } from "@vercel/blob/client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_NAME, INSTRUCTOR_NAME, STUDENT_NAME } from "@/lib/branding";
import {
  getActiveMicrophoneLabel,
  previewVideoStream,
} from "@/lib/built-in-mic";
import { restoreIOSPlaybackSession } from "@/lib/ios-audio-session";
import { readApiError } from "@/lib/read-api-error";
import { PracticeRecorder } from "@/lib/recorder";

type Props = {
  songId: string;
  songTitle: string;
  referenceVideoUrl: string;
};

type Phase =
  | "preparing"
  | "need-access"
  | "ready"
  | "recording"
  | "uploading"
  | "done"
  | "error";

export function PracticeSession({
  songId,
  songTitle,
  referenceVideoUrl,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const referenceRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<PracticeRecorder | null>(null);
  const accessStarted = useRef(false);

  const [phase, setPhase] = useState<Phase>("preparing");
  const [message, setMessage] = useState("");
  const [micLabel, setMicLabel] = useState("");

  const attachPreview = useCallback((stream: MediaStream | null) => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      return;
    }
    el.srcObject = previewVideoStream(stream);
    void el.play().catch(() => {});
  }, []);

  const requestCameraAccess = useCallback(async () => {
    setMessage("");
    setPhase("preparing");
    try {
      recorderRef.current?.cancel();
      const recorder = new PracticeRecorder();
      recorderRef.current = recorder;
      await recorder.prepare();
      attachPreview(recorder.previewStream);
      setMicLabel(getActiveMicrophoneLabel(recorder.previewStream));
      setPhase("ready");
    } catch (err) {
      console.error(err);
      recorderRef.current?.cancel();
      recorderRef.current = null;
      attachPreview(null);
      setPhase("need-access");
      setMessage(
        `Tap below and choose Allow so ${APP_NAME} can use your camera and microphone.`,
      );
    }
  }, [attachPreview]);

  useEffect(() => {
    if (accessStarted.current) return;
    accessStarted.current = true;
    void requestCameraAccess();
    return () => {
      recorderRef.current?.cancel();
    };
  }, [requestCameraAccess]);

  const startRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      await requestCameraAccess();
      return;
    }
    try {
      referenceRef.current?.pause();
      await recorder.startRecording();
      setPhase("recording");
    } catch (err) {
      console.error(err);
      setMessage("Could not start recording. Try again.");
      setPhase("error");
    }
  };

  const stopAndUpload = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    setPhase("uploading");
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

  const cancelRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && phase === "recording") {
      try {
        recorder.cancel();
      } catch {
        /* ignore */
      }
      void requestCameraAccess();
    }
    setPhase("ready");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          ← Riffs
        </Link>
        <span className="text-right text-sm font-medium opacity-80">
          {songTitle}
        </span>
      </header>

      <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-[var(--walter-grape)]">
          {INSTRUCTOR_NAME}&apos;s reference
        </p>
        <video
          ref={referenceRef}
          src={referenceVideoUrl}
          controls
          playsInline
          className="aspect-video w-full rounded-xl bg-black"
        />
        <p className="mt-2 text-center text-xs opacity-70">
          Watch this, then record yourself playing the same riff below.
        </p>
      </section>

      <div className="relative mb-4 overflow-hidden rounded-3xl border-4 border-[var(--walter-coral)] bg-black shadow-lg">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-[3/4] w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {phase === "preparing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-6 text-center">
            <p className="text-xl font-bold text-white">Allow camera &amp; microphone</p>
            <p className="mt-2 text-sm font-medium text-white/90">
              Tap <strong>Allow</strong> when your iPad asks.
            </p>
          </div>
        )}
        {(phase === "recording" || phase === "ready") && (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
            {phase === "recording" && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--walter-coral)] px-3 py-1 text-sm font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                REC
              </div>
            )}
            {micLabel && phase === "recording" && (
              <div className="max-w-[12rem] rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium leading-tight text-white">
                Mic: {micLabel}
              </div>
            )}
          </div>
        )}
      </div>

      {message && (
        <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-center text-sm text-[var(--walter-coral)]">
          {message}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {phase === "need-access" && (
          <button
            type="button"
            onClick={() => void requestCameraAccess()}
            className="rounded-2xl bg-[var(--walter-sky)] px-6 py-5 text-xl font-bold text-white shadow-md active:scale-[0.98]"
          >
            Allow camera &amp; microphone
          </button>
        )}

        {phase === "ready" && (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="rounded-2xl bg-[var(--walter-sky)] px-6 py-5 text-xl font-bold text-white shadow-md active:scale-[0.98]"
          >
            Record my riff 🎸
          </button>
        )}

        {phase === "recording" && (
          <>
            <button
              type="button"
              onClick={() => void stopAndUpload()}
              className="rounded-2xl bg-[var(--walter-coral)] px-6 py-5 text-xl font-bold text-white shadow-md active:scale-[0.98]"
            >
              Done! Send to {INSTRUCTOR_NAME} ✨
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-2xl bg-white px-6 py-3 text-base font-semibold shadow-sm"
            >
              Cancel
            </button>
          </>
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
              Pick another riff
            </Link>
          </div>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={() => void requestCameraAccess()}
            className="rounded-2xl bg-[var(--walter-sun)] px-6 py-4 text-lg font-bold"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
