/** Default practice setup: song in headphones, guitar via iPad built-in mic. */
export const HEADPHONES_MODE_DEFAULT = true;

export const MIC_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
};

const HEADSET_MIC = /headset|headphone|earpod|airpod|bluetooth|usb|external|beats|buds|wired/i;
const BUILT_IN_MIC = /ipad|built-in|internal|device microphone|microphone \(/i;

export function pickBuiltInMicrophoneDevice(
  devices: MediaDeviceInfo[],
): MediaDeviceInfo | undefined {
  const inputs = devices.filter((d) => d.kind === "audioinput");
  if (inputs.length === 0) return undefined;

  let best: MediaDeviceInfo | undefined;
  let bestScore = -Infinity;

  for (const d of inputs) {
    let score = 0;
    if (BUILT_IN_MIC.test(d.label)) score += 10;
    if (HEADSET_MIC.test(d.label)) score -= 20;
    if (!d.label.trim()) score -= 2;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  if (best && bestScore > 0) return best;
  return inputs.find((d) => !HEADSET_MIC.test(d.label)) ?? inputs[0];
}

export async function hasHeadphoneLikeOutput(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.some(
    (d) =>
      d.kind === "audiooutput" &&
      d.label.trim() !== "" &&
      HEADSET_MIC.test(d.label),
  );
}

/** Swap any headset mic track for the iPad's built-in microphone when possible. */
export async function attachBuiltInMicrophone(stream: MediaStream): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const builtIn = pickBuiltInMicrophoneDevice(devices);
  if (!builtIn?.deviceId) return;

  const current = stream.getAudioTracks()[0];
  if (current?.label && BUILT_IN_MIC.test(current.label)) return;
  if (current?.getSettings().deviceId === builtIn.deviceId) return;

  for (const track of stream.getAudioTracks()) {
    stream.removeTrack(track);
    track.stop();
  }

  try {
    const audioOnly = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...MIC_CAPTURE_CONSTRAINTS,
        deviceId: { ideal: builtIn.deviceId },
      },
    });
    const [track] = audioOnly.getAudioTracks();
    if (track) stream.addTrack(track);
  } catch {
    const fallback = await navigator.mediaDevices.getUserMedia({
      audio: MIC_CAPTURE_CONSTRAINTS,
    });
    for (const track of fallback.getAudioTracks()) {
      stream.addTrack(track);
    }
  }
}
