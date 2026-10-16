/** Default practice setup: song in headphones, guitar via iPad built-in mic. */
export const HEADPHONES_MODE_DEFAULT = true;

export const MIC_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
};

const HEADSET_MIC =
  /headset|headphone|earpod|airpod|bluetooth|external|beats|buds|hands.?free|hfp/i;
const BUILT_IN_MIC = /ipad|built-in|internal|device microphone|microphone \(/i;

export function isHeadsetMicrophoneLabel(label: string): boolean {
  return HEADSET_MIC.test(label);
}

export function isBuiltInMicrophoneLabel(label: string): boolean {
  return BUILT_IN_MIC.test(label);
}

export function pickBuiltInMicrophoneDevice(
  devices: MediaDeviceInfo[],
  videoGroupId?: string,
): MediaDeviceInfo | undefined {
  const inputs = devices.filter((d) => d.kind === "audioinput");
  if (inputs.length === 0) return undefined;

  if (videoGroupId) {
    const sameGroup = inputs.find((d) => d.groupId === videoGroupId);
    if (sameGroup && !HEADSET_MIC.test(sameGroup.label)) {
      return sameGroup;
    }
  }

  let best: MediaDeviceInfo | undefined;
  let bestScore = -Infinity;

  for (const d of inputs) {
    let score = 0;
    if (BUILT_IN_MIC.test(d.label)) score += 10;
    if (HEADSET_MIC.test(d.label)) score -= 20;
    if (videoGroupId && d.groupId === videoGroupId) score += 15;
    if (!d.label.trim()) score -= 2;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  if (best && bestScore > 0) return best;
  const notHeadset = inputs.filter((d) => !HEADSET_MIC.test(d.label));
  if (notHeadset.length === 1) return notHeadset[0];
  return notHeadset[0] ?? inputs[0];
}

async function enumerateInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audioinput");
}

async function primeAudioDeviceLabels(): Promise<void> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: MIC_CAPTURE_CONSTRAINTS,
      video: false,
    });
    s.getTracks().forEach((t) => t.stop());
  } catch {
    /* ignore */
  }
}

async function resolveBuiltInMicDeviceId(
  videoGroupId?: string,
): Promise<string | undefined> {
  let inputs = await enumerateInputs();
  if (inputs.every((d) => !d.label.trim())) {
    await primeAudioDeviceLabels();
    inputs = await enumerateInputs();
  }
  return pickBuiltInMicrophoneDevice(inputs, videoGroupId)?.deviceId;
}

async function acquireAudioTrack(deviceId?: string): Promise<MediaStreamTrack> {
  const base = { ...MIC_CAPTURE_CONSTRAINTS };

  if (deviceId) {
    try {
      const exact = await navigator.mediaDevices.getUserMedia({
        audio: { ...base, deviceId: { exact: deviceId } },
        video: false,
      });
      const [track] = exact.getAudioTracks();
      if (track) return track;
    } catch {
      /* try ideal */
    }
    const ideal = await navigator.mediaDevices.getUserMedia({
      audio: { ...base, deviceId: { ideal: deviceId } },
      video: false,
    });
    const [track] = ideal.getAudioTracks();
    if (track) return track;
  }

  const fallback = await navigator.mediaDevices.getUserMedia({
    audio: base,
    video: false,
  });
  const [track] = fallback.getAudioTracks();
  if (!track) throw new Error("No microphone available");
  return track;
}

async function replaceAudioTrack(
  stream: MediaStream,
  deviceId: string,
): Promise<MediaStreamTrack> {
  for (const t of stream.getAudioTracks()) {
    stream.removeTrack(t);
    t.stop();
  }
  const track = await acquireAudioTrack(deviceId);
  stream.addTrack(track);
  return track;
}

/** Try other inputs if we still landed on a headset mic. */
async function forceBuiltInMic(
  stream: MediaStream,
  videoGroupId?: string,
): Promise<void> {
  const audio = stream.getAudioTracks()[0];
  if (!audio) return;
  if (isBuiltInMicrophoneLabel(audio.label)) return;
  if (!isHeadsetMicrophoneLabel(audio.label) && videoGroupId) {
    const gid = audio.getSettings().groupId;
    if (gid && gid === videoGroupId) return;
  }

  const inputs = await enumerateInputs();
  const candidates = inputs.filter(
    (d) =>
      d.deviceId &&
      d.deviceId !== audio.getSettings().deviceId &&
      !HEADSET_MIC.test(d.label),
  );

  const ordered = [...candidates].sort((a, b) => {
    let sa = 0;
    let sb = 0;
    if (a.groupId === videoGroupId) sa += 10;
    if (b.groupId === videoGroupId) sb += 10;
    if (BUILT_IN_MIC.test(a.label)) sa += 5;
    if (BUILT_IN_MIC.test(b.label)) sb += 5;
    return sb - sa;
  });

  for (const device of ordered) {
    try {
      const track = await replaceAudioTrack(stream, device.deviceId);
      if (!isHeadsetMicrophoneLabel(track.label)) return;
    } catch {
      continue;
    }
  }
}

const PRACTICE_VIDEO: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/**
 * Front camera + chosen mic in one getUserMedia call.
 * Safari/iOS MediaRecorder often records silent audio when video and mic come
 * from separate capture sessions and are merged manually.
 */
export async function openPracticeMediaStream(
  micDeviceId: string,
): Promise<MediaStream> {
  if (!micDeviceId) {
    throw new Error("Choose a microphone first");
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: PRACTICE_VIDEO,
      audio: { ...MIC_CAPTURE_CONSTRAINTS, deviceId: { ideal: micDeviceId } },
    },
    {
      video: PRACTICE_VIDEO,
      audio: { ...MIC_CAPTURE_CONSTRAINTS, deviceId: { exact: micDeviceId } },
    },
    { video: PRACTICE_VIDEO, audio: MIC_CAPTURE_CONSTRAINTS },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audio = stream.getAudioTracks()[0];
      if (audio) {
        audio.enabled = true;
        return stream;
      }
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No microphone available");
}

export function getActiveMicrophoneLabel(stream: MediaStream | null): string {
  return stream?.getAudioTracks()[0]?.label?.trim() || "Microphone";
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
