export const MIC_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
};

const PRACTICE_VIDEO: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/** Front camera + default mic in one getUserMedia call (Safari-friendly). */
export async function openPracticeMediaStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: PRACTICE_VIDEO,
      audio: MIC_CAPTURE_CONSTRAINTS,
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({
      video: PRACTICE_VIDEO,
      audio: true,
    });
  }
}

/** Preview element should only get video (not mic tracks). */
export function previewVideoStream(full: MediaStream): MediaStream {
  return new MediaStream(full.getVideoTracks());
}

export function getActiveMicrophoneLabel(stream: MediaStream | null): string {
  return stream?.getAudioTracks()[0]?.label?.trim() || "Microphone";
}
