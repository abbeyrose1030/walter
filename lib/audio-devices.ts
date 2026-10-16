import { pickBuiltInMicrophoneDevice } from "@/lib/built-in-mic";

export type DeviceOption = {
  deviceId: string;
  label: string;
};

const HEADPHONE_OUT =
  /headphone|headset|earpod|airpod|bluetooth|external|usb|beats|buds/i;

export function supportsAudioOutputSelection(): boolean {
  if (typeof Audio === "undefined") return false;
  return "setSinkId" in Audio.prototype;
}

function labelOrFallback(device: MediaDeviceInfo, kind: string): string {
  if (device.label.trim()) return device.label;
  return `${kind} (${device.deviceId.slice(0, 8)}…)`;
}

/** Requests camera + mic once so iOS exposes device names. */
export async function loadAudioDeviceOptions(): Promise<{
  inputs: DeviceOption[];
  outputs: DeviceOption[];
}> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode: "user" },
  });
  stream.getTracks().forEach((t) => t.stop());

  const devices = await navigator.mediaDevices.enumerateDevices();

  const inputs = devices
    .filter((d) => d.kind === "audioinput")
    .map((d) => ({
      deviceId: d.deviceId,
      label: labelOrFallback(d, "Microphone"),
    }));

  const outputs = devices
    .filter((d) => d.kind === "audiooutput")
    .map((d) => ({
      deviceId: d.deviceId,
      label: labelOrFallback(d, "Speaker"),
    }));

  return { inputs, outputs };
}

export function defaultHeadphoneOutputId(
  outputs: DeviceOption[],
): string | undefined {
  const headphone = outputs.find((o) => HEADPHONE_OUT.test(o.label));
  return headphone?.deviceId ?? outputs[0]?.deviceId;
}

export function defaultMicrophoneInputId(
  inputs: DeviceOption[],
): string | undefined {
  const picked = pickBuiltInMicrophoneDevice(
    inputs.map((i) => ({
      deviceId: i.deviceId,
      kind: "audioinput" as MediaDeviceKind,
      label: i.label,
      groupId: "",
      toJSON: () => ({}),
    })),
  );
  return picked?.deviceId ?? inputs[0]?.deviceId;
}
