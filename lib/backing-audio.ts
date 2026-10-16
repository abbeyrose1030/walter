/**
 * Backing track playback. Uses HTMLAudioElement so the user can pick an output
 * device (headphones) via setSinkId when the browser supports it.
 */
export class BackingAudioPlayer {
  private trackUrl = "";
  private audio: HTMLAudioElement | null = null;
  private outputDeviceId = "";

  setOutputDevice(deviceId: string): void {
    this.outputDeviceId = deviceId;
  }

  async loadFromUrl(url: string): Promise<void> {
    this.trackUrl = url;
  }

  async unlock(): Promise<void> {
    const audio = await this.ensureAudio();
    audio.muted = true;
    try {
      await audio.play();
      audio.pause();
      audio.muted = false;
      audio.currentTime = 0;
    } catch {
      audio.muted = false;
    }
  }

  private async ensureAudio(): Promise<HTMLAudioElement> {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.setAttribute("playsinline", "true");
      this.audio.preload = "auto";
    }
    if (this.trackUrl && this.audio.src !== this.trackUrl) {
      this.audio.src = this.trackUrl;
    }
    return this.audio;
  }

  private async applyOutputDevice(): Promise<void> {
    if (!this.outputDeviceId) return;
    const audio = await this.ensureAudio();
    if (typeof audio.setSinkId === "function") {
      await audio.setSinkId(this.outputDeviceId);
    }
  }

  async play(fromSeconds = 0): Promise<void> {
    if (!this.trackUrl) return;
    const audio = await this.ensureAudio();
    await this.applyOutputDevice();
    audio.currentTime = fromSeconds;
    await audio.play();
  }

  pause(): void {
    this.audio?.pause();
  }

  async resume(): Promise<void> {
    if (!this.audio) return;
    await this.audio.play();
  }

  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  setVolume(v: number): void {
    if (this.audio) {
      this.audio.volume = Math.min(1, Math.max(0, v));
    }
  }

  dispose(): void {
    this.stop();
    if (this.audio) {
      this.audio.src = "";
      this.audio = null;
    }
  }
}
