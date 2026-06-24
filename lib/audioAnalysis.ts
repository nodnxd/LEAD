// Client-side audio analysis for pitch files.
// BPM via web-audio-beat-detector; musical key via chroma + Krumhansl-Schmuckler;
// vocal gender via fundamental-frequency estimate (suggestion only — full-mix F0 is unreliable).
import { analyze } from 'web-audio-beat-detector';

export type Analysis = {
  vocal: 'male' | 'female' | 'unknown';
  duration: number;
  bpm: number | null;
  key: string; // '', 'C', 'Am', 'F#', ...
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Krumhansl-Kessler key profiles
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function clampBpm(bpm: number): number {
  let b = bpm;
  while (b < 70) b *= 2;
  while (b > 185) b /= 2;
  return Math.round(b);
}

// In-place iterative radix-2 FFT (size must be a power of two).
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; num += xa * xb; da += xa * xa; db += xb * xb; }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

function detectKey(buf: AudioBuffer): string {
  const sr = buf.sampleRate;
  const ch = buf.getChannelData(0);
  const N = 8192, hop = 8192;
  const maxSamples = Math.min(ch.length, sr * 120); // up to ~2 min
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)); // Hann
  const chroma = new Array(12).fill(0);
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let start = 0; start + N <= maxSamples; start += hop) {
    for (let i = 0; i < N; i++) { re[i] = ch[start + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const freq = (k * sr) / N;
      if (freq < 55 || freq > 5000) continue;
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      let pc = Math.round(12 * Math.log2(freq / 440) + 69) % 12;
      if (pc < 0) pc += 12;
      chroma[pc] += mag;
    }
  }
  const sum = chroma.reduce((a, b) => a + b, 0);
  if (sum === 0) return '';
  const norm = chroma.map((c) => c / sum);
  let best = -2, bestKey = '';
  for (let tonic = 0; tonic < 12; tonic++) {
    const majProf = KS_MAJOR.map((_, i) => KS_MAJOR[(i - tonic + 12) % 12]);
    const minProf = KS_MINOR.map((_, i) => KS_MINOR[(i - tonic + 12) % 12]);
    const cMaj = pearson(norm, majProf);
    const cMin = pearson(norm, minProf);
    if (cMaj > best) { best = cMaj; bestKey = NOTE_NAMES[tonic]; }
    if (cMin > best) { best = cMin; bestKey = NOTE_NAMES[tonic] + 'm'; }
  }
  return bestKey;
}

function detectVocal(buf: AudioBuffer): 'male' | 'female' | 'unknown' {
  const sr = buf.sampleRate;
  const ch = buf.getChannelData(0);
  const startSec = Math.min(buf.duration * 0.2, Math.max(0, buf.duration - 8));
  const durSec = Math.min(5, buf.duration - startSec);
  if (durSec < 1) return 'unknown';
  const s0 = Math.floor(startSec * sr), len = Math.floor(durSec * sr);
  const fSize = Math.floor(sr * 0.04), pitches: number[] = [];
  const minL = Math.floor(sr / 380), maxL = Math.floor(sr / 65);
  for (let start = s0; start < s0 + len - fSize; start += fSize) {
    let maxC = -Infinity, bestL = 0;
    for (let lag = minL; lag <= maxL; lag++) {
      let c = 0, n = 0;
      for (let i = 0; i < fSize - lag; i++) { c += ch[start + i] * ch[start + i + lag]; n += ch[start + i] * ch[start + i]; }
      const nc = n > 0 ? c / n : 0;
      if (nc > maxC) { maxC = nc; bestL = lag; }
    }
    if (maxC > 0.15 && bestL > 0) pitches.push(sr / bestL);
  }
  if (pitches.length < 3) return 'unknown';
  pitches.sort((a, b) => a - b);
  const med = pitches[Math.floor(pitches.length / 2)];
  if (med < 158) return 'male';
  if (med > 195) return 'female';
  return 'unknown';
}

export async function analyzeAudio(file: File): Promise<Analysis> {
  try {
    const AudioCtx = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(await file.arrayBuffer());
    await ctx.close();
    const duration = Math.round(audioBuffer.duration);
    let bpm: number | null = null;
    try { const t = await analyze(audioBuffer); if (t && isFinite(t)) bpm = clampBpm(t); } catch { /* no tempo */ }
    let key = ''; try { key = detectKey(audioBuffer); } catch { /* no key */ }
    let vocal: 'male' | 'female' | 'unknown' = 'unknown'; try { vocal = detectVocal(audioBuffer); } catch { /* no vocal */ }
    return { vocal, duration, bpm, key };
  } catch {
    return { vocal: 'unknown', duration: 0, bpm: null, key: '' };
  }
}
