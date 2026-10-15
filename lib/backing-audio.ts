/**
 * Plays backing tracks through Web Audio API so iOS is less likely to duck
 * playback when the mic is active for recording (vs. a plain <audio> element).
 */
export class BackingAudioPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private buffer: AudioBuffer | null = null;
  private playing = false;

  async loadFromUrl(url: string): Promise<void> {
    await this.ensureContext();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    this.buffer = await this.context!.decodeAudioData(arrayBuffer);
    this.pausedAt = 0;
    this.stopInternal(false);
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      const Ctx =
        typeof window !== "undefined"
          ? window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext
          : null;
      if (!Ctx) throw new Error("Web Audio not supported");
      this.context = new Ctx();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0.85;
      this.gain.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    return this.context;
  }

  /** Call on first user tap before recording — unlocks audio on iOS. */
  async unlock(): Promise<void> {
    await this.ensureContext();
  }

  async play(fromSeconds = 0): Promise<void> {
    if (!this.buffer) return;
    await this.ensureContext();
    this.stopInternal(false);

    const source = this.context!.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.gain!);
    source.start(0, fromSeconds);
    this.source = source;
    this.startedAt = this.context!.currentTime - fromSeconds;
    this.playing = true;
    this.pausedAt = 0;

    source.onended = () => {
      if (this.playing) {
        this.playing = false;
        this.pausedAt = 0;
      }
    };
  }

  pause(): void {
    if (!this.playing || !this.context) return;
    this.pausedAt = this.context.currentTime - this.startedAt;
    this.stopInternal(false);
    this.playing = false;
  }

  async resume(): Promise<void> {
    if (this.playing || !this.buffer) return;
    await this.play(this.fromSeconds());
  }

  stop(): void {
    this.stopInternal(true);
    this.playing = false;
    this.pausedAt = 0;
  }

  private stopInternal(resetPause: boolean): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = null;
    }
    if (resetPause) this.pausedAt = 0;
  }

  fromSeconds(): number {
    if (this.playing && this.context) {
      return this.context.currentTime - this.startedAt;
    }
    return this.pausedAt;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setVolume(v: number): void {
    if (this.gain) this.gain.gain.value = Math.min(1, Math.max(0, v));
  }

  dispose(): void {
    this.stop();
    if (this.context) {
      void this.context.close();
    }
    this.context = null;
    this.gain = null;
    this.buffer = null;
  }
}
