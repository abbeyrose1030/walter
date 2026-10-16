"use client";

import { useCallback, useState } from "react";
import {
  defaultHeadphoneOutputId,
  defaultMicrophoneInputId,
  loadAudioDeviceOptions,
  supportsAudioOutputSelection,
  type DeviceOption,
} from "@/lib/audio-devices";

export type AudioDeviceSelection = {
  inputId: string;
  outputId: string;
};

type Props = {
  disabled?: boolean;
  onReady: (selection: AudioDeviceSelection) => void;
};

export function AudioDevicePicker({ disabled, onReady }: Props) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [inputs, setInputs] = useState<DeviceOption[]>([]);
  const [outputs, setOutputs] = useState<DeviceOption[]>([]);
  const [inputId, setInputId] = useState("");
  const [outputId, setOutputId] = useState("");

  const emit = useCallback(
    (inId: string, outId: string) => {
      if (inId && outId) {
        onReady({ inputId: inId, outputId: outId });
      }
    },
    [onReady],
  );

  const loadDevices = async () => {
    setLoading(true);
    setError("");
    try {
      const { inputs: inOpts, outputs: outOpts } =
        await loadAudioDeviceOptions();
      setInputs(inOpts);
      setOutputs(outOpts);

      const defaultIn = defaultMicrophoneInputId(inOpts) ?? "";
      const defaultOut = defaultHeadphoneOutputId(outOpts) ?? "";

      setInputId(defaultIn);
      setOutputId(defaultOut);
      setReady(true);
      emit(defaultIn, defaultOut);
    } catch {
      setError(
        "Could not list devices. Allow camera and microphone, then try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const outputHelp = supportsAudioOutputSelection()
    ? "Pick where the song should play (usually your headphones)."
    : "Your iPad may not let websites pick speakers — plug in headphones before you start; iOS will route there.";

  return (
    <div className="mb-4 rounded-2xl border-2 border-[var(--walter-sky)] bg-white p-4 text-sm">
      <p className="mb-2 text-center font-bold">Sound setup</p>

      {!ready ? (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void loadDevices()}
          className="w-full rounded-xl bg-[var(--walter-sky)] px-4 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Choose headphones & mic"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase opacity-70">
              Hear song through
            </span>
            <select
              value={outputId}
              disabled={disabled}
              onChange={(e) => {
                const id = e.target.value;
                setOutputId(id);
                emit(inputId, id);
              }}
              className="rounded-xl border-2 border-[var(--walter-sun)] bg-white px-3 py-2 text-base"
            >
              {outputs.map((o) => (
                <option key={o.deviceId} value={o.deviceId}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-xs opacity-70">{outputHelp}</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase opacity-70">
              Record guitar with
            </span>
            <select
              value={inputId}
              disabled={disabled}
              onChange={(e) => {
                const id = e.target.value;
                setInputId(id);
                emit(id, outputId);
              }}
              className="rounded-xl border-2 border-[var(--walter-sun)] bg-white px-3 py-2 text-base"
            >
              {inputs.map((i) => (
                <option key={i.deviceId} value={i.deviceId}>
                  {i.label}
                </option>
              ))}
            </select>
            <span className="text-xs opacity-70">
              Usually <strong>iPad Microphone</strong>, not headphone mic.
            </span>
          </label>

          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => void loadDevices()}
            className="text-xs font-semibold text-[var(--walter-grape)]"
          >
            Refresh device list
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-xs font-semibold text-[var(--walter-coral)]">
          {error}
        </p>
      )}
    </div>
  );
}
