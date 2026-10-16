"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  centsOffTarget,
  detectPitchHz,
  GUITAR_STRINGS,
  nearestGuitarString,
} from "@/lib/pitch";

type TunerState = "idle" | "listening" | "error";

const IN_TUNE_CENTS = 8;

export function GuitarTuner() {
  const [state, setState] = useState<TunerState>("idle");
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState<string>("e2");
  const [display, setDisplay] = useState({
    cents: 0,
    inTune: false,
    hz: 0,
    stringLabel: "E",
    stringNum: 6,
  });

  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const bufferRef = useRef<Float32Array | null>(null);
  const targetIdRef = useRef(targetId);

  useEffect(() => {
    targetIdRef.current = targetId;
  }, [targetId]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (contextRef.current) {
      void contextRef.current.close();
      contextRef.current = null;
    }
    setState("idle");
    setDisplay({
      cents: 0,
      inTune: false,
      hz: 0,
      stringLabel: "E",
      stringNum: 6,
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = contextRef.current;
    if (!analyser || !ctx) return;

    if (!bufferRef.current || bufferRef.current.length !== analyser.fftSize) {
      bufferRef.current = new Float32Array(analyser.fftSize);
    }
    const buf = bufferRef.current;
    analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);

    const hz = detectPitchHz(buf, ctx.sampleRate);
    const manual = GUITAR_STRINGS.find((s) => s.id === targetIdRef.current);
    const target =
      manual ??
      (hz > 0 ? nearestGuitarString(hz) : GUITAR_STRINGS[0]);

    if (hz > 0) {
      const cents = centsOffTarget(hz, target.freq);
      setDisplay({
        cents,
        inTune: Math.abs(cents) <= IN_TUNE_CENTS,
        hz,
        stringLabel: target.label,
        stringNum: target.string,
      });
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = async () => {
    setMessage("");
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      streamRef.current = stream;

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      contextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;

      await ctx.resume();
      setState("listening");
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState("error");
      setMessage("Allow the microphone to use the tuner.");
    }
  };

  const target = GUITAR_STRINGS.find((s) => s.id === targetId) ?? GUITAR_STRINGS[0];
  const meter = Math.max(-50, Math.min(50, display.cents));
  const meterPercent = 50 + meter;

  return (
    <section className="mb-8 rounded-3xl border-2 border-[var(--walter-grape)] bg-white p-4 shadow-sm">
      <p className="mb-1 text-center text-lg font-bold text-[var(--walter-grape)]">
        Guitar tuner 🎸
      </p>
      <p className="mb-3 text-center text-xs opacity-70">
        Pluck one string at a time. Green means in tune!
      </p>

      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {GUITAR_STRINGS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setTargetId(s.id)}
            className={`min-w-[2.75rem] rounded-xl px-3 py-2 text-sm font-bold transition ${
              targetId === s.id
                ? "bg-[var(--walter-grape)] text-white"
                : "bg-[var(--walter-sun)]/50 text-[var(--walter-ink)]"
            }`}
          >
            {s.label}
            <span className="block text-[10px] font-medium opacity-80">
              {s.string}
            </span>
          </button>
        ))}
      </div>

      <div
        className={`mb-3 rounded-2xl px-4 py-5 text-center transition-colors ${
          state === "listening" && display.inTune
            ? "bg-[var(--walter-sky)]/35"
            : "bg-[var(--walter-cream)]"
        }`}
      >
        <p className="text-5xl font-bold tabular-nums tracking-tight">
          {state === "listening" ? target.label : "—"}
        </p>
        <p className="mt-1 text-sm font-semibold opacity-80">
          {state === "listening"
            ? `String ${display.stringNum} · ${display.hz > 0 ? `${display.hz.toFixed(0)} Hz` : "Listening…"}`
            : `String ${target.string} · ${target.freq.toFixed(0)} Hz`}
        </p>
        {state === "listening" && display.hz > 0 && (
          <p
            className={`mt-2 text-base font-bold ${
              display.inTune ? "text-[var(--walter-sky)]" : "text-[var(--walter-coral)]"
            }`}
          >
            {display.inTune
              ? "In tune! ✨"
              : display.cents > 0
                ? `Too sharp ↑ (${display.cents}¢)`
                : `Too flat ↓ (${Math.abs(display.cents)}¢)`}
          </p>
        )}
      </div>

      {state === "listening" && (
        <div className="mb-3 px-2">
          <div className="relative h-3 overflow-hidden rounded-full bg-[var(--walter-sun)]/40">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--walter-ink)]/40"
              style={{ left: "50%" }}
            />
            <div
              className={`absolute top-0.5 bottom-0.5 w-3 rounded-full shadow ${
                display.inTune ? "bg-[var(--walter-sky)]" : "bg-[var(--walter-coral)]"
              }`}
              style={{
                left: `calc(${display.hz > 0 ? meterPercent : 50}% - 6px)`,
                transition: "left 0.08s linear",
              }}
            />
          </div>
          <p className="mt-1 text-center text-[10px] font-medium opacity-60">
            flat ← → sharp
          </p>
        </div>
      )}

      {message && (
        <p className="mb-2 text-center text-xs font-semibold text-[var(--walter-coral)]">
          {message}
        </p>
      )}

      {state === "listening" ? (
        <button
          type="button"
          onClick={stop}
          className="w-full rounded-2xl bg-white py-3 text-base font-bold ring-2 ring-[var(--walter-grape)]"
        >
          Stop tuner
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          className="w-full rounded-2xl bg-[var(--walter-grape)] py-3 text-base font-bold text-white shadow-md active:scale-[0.98]"
        >
          {state === "error" ? "Try again — allow mic" : "Start tuner"}
        </button>
      )}
    </section>
  );
}
