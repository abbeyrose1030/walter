type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string };
};

type MicrophoneSessionNavigator = Navigator & {
  mediaSession?: MediaSession & {
    setMicrophoneActive?: (active: boolean) => Promise<void>;
  };
};

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

export async function setIOSMicrophoneCaptureActive(
  active: boolean,
): Promise<void> {
  const nav = navigator as MicrophoneSessionNavigator;
  const fn = nav.mediaSession?.setMicrophoneActive;
  if (!fn) return;
  try {
    await fn.call(nav.mediaSession, active);
  } catch {
    /* ignore */
  }
}

export function prepareIOSAudioSessionForCapture(): void {
  const nav = navigator as AudioSessionNavigator;
  if (!nav.audioSession) return;
  try {
    nav.audioSession.type = "auto";
  } catch {
    /* ignore */
  }
}

export async function activateIOSPlayAndRecord(): Promise<void> {
  await setIOSMicrophoneCaptureActive(true);
  setIOSPlayAndRecord();
}
