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

function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Let WebKit pick the muxer on iOS — explicit types often drop audio.
  if (isAppleTouchDevice()) return undefined;
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

    const mimeType = pickRecorderMimeType();
    this.recorder = mimeType
      ? new MediaRecorder(this.stream!, { mimeType })
      : new MediaRecorder(this.stream!);

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    // No timeslice on iOS — avoids empty/silent first segments in Safari.
    if (isAppleTouchDevice()) {
      this.recorder.start();
    } else {
      this.recorder.start(1000);
    }
  }

  stop(): Promise<{ blob: Blob; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error("Not recording"));
        return;
      }

      const recorder = this.recorder;
      const mimeType = recorder.mimeType || "video/webm";

      recorder.onstop = () => {
        if (this.chunks.length === 0) {
          this.cleanup();
          reject(new Error("Recording was empty — try again."));
          return;
        }
        const blob = new Blob(this.chunks, { type: mimeType });
        if (blob.size < 1024) {
          this.cleanup();
          reject(new Error("Recording too short — try again."));
          return;
        }
        this.cleanup();
        resolve({ blob, mimeType });
      };

      recorder.onerror = () => {
        this.cleanup();
        reject(new Error("Recording failed"));
      };

      if (recorder.state === "recording") {
        try {
          recorder.requestData();
        } catch {
          /* optional on some browsers */
        }
        recorder.stop();
      }
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
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
