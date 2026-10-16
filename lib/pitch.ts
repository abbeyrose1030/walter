/** Standard tuning — frequency in Hz (equal temperament). */
export const GUITAR_STRINGS = [
  { id: "e2", label: "E", string: 6, freq: 82.41 },
  { id: "a2", label: "A", string: 5, freq: 110.0 },
  { id: "d3", label: "D", string: 4, freq: 146.83 },
  { id: "g3", label: "G", string: 3, freq: 196.0 },
  { id: "b3", label: "B", string: 2, freq: 246.94 },
  { id: "e4", label: "E", string: 1, freq: 329.63 },
] as const;

/** Autocorrelation pitch (Hz). Returns -1 if too quiet / unclear. */
export function detectPitchHz(
  buffer: Float32Array,
  sampleRate: number,
): number {
  const size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.008) return -1;

  let r1 = 0;
  let r2 = size - 1;
  const threshold = 0.15;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buffer[size - i]) < threshold) {
      r2 = size - i;
      break;
    }
  }

  const trimmed = buffer.subarray(r1, r2);
  const n = trimmed.length;
  if (n < 256) return -1;

  const c = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    c[lag] = sum;
  }

  let d = 0;
  while (d + 1 < n && c[d] > c[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  const minLag = Math.floor(sampleRate / 450);
  const maxLag = Math.floor(sampleRate / 65);
  for (let i = Math.max(d, minLag); i < Math.min(n, maxLag); i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos < 0) return -1;

  let T0 = maxPos;
  if (T0 > 0 && T0 < n - 1) {
    const x0 = c[T0 - 1];
    const x1 = c[T0];
    const x2 = c[T0 + 1];
    const denom = 2 * x1 - x2 - x0;
    if (denom !== 0) {
      T0 = T0 + (x2 - x0) / (2 * denom);
    }
  }

  const hz = sampleRate / T0;
  if (hz < 65 || hz > 450) return -1;
  return hz;
}

export function centsOffTarget(detectedHz: number, targetHz: number): number {
  return Math.round(1200 * Math.log2(detectedHz / targetHz));
}

/** Nearest guitar string for a detected frequency. */
export type GuitarString = (typeof GUITAR_STRINGS)[number];

export function nearestGuitarString(hz: number): GuitarString {
  let best: GuitarString = GUITAR_STRINGS[0];
  let bestDiff = Infinity;
  for (const s of GUITAR_STRINGS) {
    const diff = Math.abs(Math.log2(hz / s.freq));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return best;
}
