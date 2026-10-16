import { openPracticeMediaStream } from "@/lib/built-in-mic";
import {
  activateIOSPlayAndRecord,
  prepareIOSAudioSessionForCapture,
} from "@/lib/ios-audio-session";

const VIDEO_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const mime of VIDEO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export async function openFrontCameraStream(
  micDeviceId: string,
): Promise<MediaStream> {
  prepareIOSAudioSessionForCapture();
  const stream = await openPracticeMediaStream(micDeviceId);
  activateIOSPlayAndRecord();
  return stream;
}

export class PracticeRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  get previewStream(): MediaStream | null {
    return this.stream;
  }

  /** Open camera + mic (preview during countdown). */
  async prepare(micDeviceId: string): Promise<void> {
    if (this.stream) return;
    this.stream = await openFrontCameraStream(micDeviceId);
  }

  /** Start writing video after countdown. */
  async startRecording(micDeviceId: string): Promise<void> {
    if (!this.stream) {
      await this.prepare(micDeviceId);
    }
    if (this.recorder?.state === "recording") return;

    this.chunks = [];

    const audioTrack = this.stream!.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState !== "live") {
      throw new Error("Microphone is not active — pick a mic and try again.");
    }
    audioTrack.enabled = true;

    const mimeType = pickRecorderMimeType();
    this.recorder = mimeType
      ? new MediaRecorder(this.stream!, { mimeType })
      : new MediaRecorder(this.stream!);

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.recorder.start(1000);
  }

  /** @deprecated use prepare + startRecording */
  async start(micDeviceId: string): Promise<void> {
    await this.prepare(micDeviceId);
    await this.startRecording(micDeviceId);
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
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve({ blob, mimeType });
      };

      recorder.onerror = () => {
        this.cleanup();
        reject(new Error("Recording failed"));
      };

      if (recorder.state !== "inactive") recorder.stop();
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
