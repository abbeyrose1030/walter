import { openPracticeMediaStream } from "@/lib/built-in-mic";
import {
  activateIOSPlayAndRecord,
  prepareIOSAudioSessionForCapture,
} from "@/lib/ios-audio-session";

const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
];

/** ~250ms slices — Safari often delivers no data at all with start() and no timeslice. */
const RECORD_TIMESLICE_MS = 250;

function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (isAppleTouchDevice()) {
    if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
    return undefined;
  }
  for (const mime of VIDEO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export async function openFrontCameraStream(): Promise<MediaStream> {
  prepareIOSAudioSessionForCapture();
  const stream = await openPracticeMediaStream();
  await activateIOSPlayAndRecord();
  return stream;
}

export class PracticeRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private recordingStartedAt = 0;

  get previewStream(): MediaStream | null {
    return this.stream;
  }

  async prepare(): Promise<void> {
    if (this.stream) return;
    this.stream = await openFrontCameraStream();
  }

  async startRecording(): Promise<void> {
    if (!this.stream) {
      await this.prepare();
    }
    if (this.recorder?.state === "recording") return;

    const audioTrack = this.stream!.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState !== "live") {
      throw new Error("Microphone is not active — allow access and try again.");
    }
    audioTrack.enabled = true;
    await activateIOSPlayAndRecord();

    this.chunks = [];
    this.recordingStartedAt = Date.now();

    const mimeType = pickRecorderMimeType();
    this.recorder = mimeType
      ? new MediaRecorder(this.stream!, { mimeType })
      : new MediaRecorder(this.stream!);

    this.recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) this.chunks.push(e.data);
    };

    this.recorder.start(RECORD_TIMESLICE_MS);
  }

  stop(): Promise<{ blob: Blob; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) {
        reject(new Error("Not recording"));
        return;
      }

      const elapsed = Date.now() - this.recordingStartedAt;
      if (elapsed < 800) {
        reject(new Error("Record for at least a second, then tap Done."));
        return;
      }

      const mimeType = recorder.mimeType || "video/mp4";

      const appendChunk = (e: BlobEvent) => {
        if (e.data?.size > 0) this.chunks.push(e.data);
      };

      recorder.addEventListener("dataavailable", appendChunk);

      const finalize = () => {
        recorder.removeEventListener("dataavailable", appendChunk);

        const blob = new Blob(this.chunks, { type: mimeType });
        if (blob.size < 512) {
          this.cleanup();
          reject(
            new Error(
              "Recording was empty — wait for REC, play a few seconds, then tap Done.",
            ),
          );
          return;
        }
        this.cleanup();
        resolve({ blob, mimeType });
      };

      recorder.onerror = () => {
        recorder.removeEventListener("dataavailable", appendChunk);
        this.cleanup();
        reject(new Error("Recording failed"));
      };

      recorder.onstop = () => {
        // WebKit often emits the last chunk after onstop begins.
        setTimeout(finalize, isAppleTouchDevice() ? 400 : 100);
      };

      const doStop = () => {
        if (recorder.state !== "recording") {
          recorder.removeEventListener("dataavailable", appendChunk);
          reject(new Error("Not recording"));
          return;
        }
        try {
          recorder.requestData();
        } catch {
          /* not supported everywhere */
        }
        recorder.stop();
      };

      if (isAppleTouchDevice()) {
        try {
          recorder.requestData();
        } catch {
          /* ignore */
        }
        setTimeout(doStop, 80);
      } else {
        doStop();
      }
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.recordingStartedAt = 0;
  }

  cancel(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.cleanup();
  }
}
