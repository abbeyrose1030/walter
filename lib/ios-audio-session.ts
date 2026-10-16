type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string };
};

/** Best-effort iOS/Safari routing so backing track + mic can coexist. */
export function resetIOSAudioSession(): void {
  const nav = navigator as AudioSessionNavigator;
  if (!nav.audioSession) return;
  try {
    nav.audioSession.type = "auto";
  } catch {
    /* ignore */
  }
}

export function setIOSPlayAndRecord(): void {
  const nav = navigator as AudioSessionNavigator;
  if (!nav.audioSession) return;
  try {
    nav.audioSession.type = "play-and-record";
  } catch {
    /* ignore */
  }
}

export function restoreIOSPlaybackSession(): void {
  const nav = navigator as AudioSessionNavigator;
  if (!nav.audioSession) return;
  try {
    nav.audioSession.type = "playback";
    nav.audioSession.type = "auto";
  } catch {
    /* ignore */
  }
}

/**
 * Call right before getUserMedia on iOS (see WebKit / StackOverflow routing notes).
 */
export function prepareIOSAudioSessionForCapture(): void {
  resetIOSAudioSession();
}

/**
 * Call after getUserMedia succeeds, before backing track plays during practice.
 */
export function activateIOSPlayAndRecord(): void {
  setIOSPlayAndRecord();
}
