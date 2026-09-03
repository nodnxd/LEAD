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
// Temperley(Kostka-Payne) 프로파일. Krumhansl-Kessler는 실험실 톤 자극으로 만든 것이라
// 대중음악 녹음에서는 나란한 장·단조를 자주 뒤바꾼다. 이쪽이 실제 악보 통계 기반이다.
const TEMPERLEY_MAJOR = [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0];
const TEMPERLEY_MINOR = [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0];

// 스테레오는 두 채널을 합쳐서 본다 — 보컬은 대개 가운데라 합치면 오히려 또렷해진다
function mixToMono(buf: AudioBuffer): Float32Array {
  if (buf.numberOfChannels === 1) return buf.getChannelData(0);
  const l = buf.getChannelData(0), r = buf.getChannelData(1);
  const out = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) out[i] = (l[i] + r[i]) / 2;
  return out;
}

// 1차 고역통과. 킥·베이스가 보컬과 같은 대역에 있어서 f0 추정을 통째로 망친다.
function highpass(x: Float32Array, sr: number, fc: number): Float32Array {
  const dt = 1 / sr, rc = 1 / (2 * Math.PI * fc), a = rc / (rc + dt);
  const y = new Float32Array(x.length);
  for (let i = 1; i < x.length; i++) y[i] = a * (y[i - 1] + x[i] - x[i - 1]);
  return y;
}

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

// 전엔 FFT 빈을 전부 그대로 chroma에 더했다. 문제가 셋이었다.
//  1) 빈 하나가 5.4Hz라 낮은 음에서 반음의 80%를 넘어 음이 옆 칸으로 샜다
//  2) 크기를 그대로 더해서 베이스·킥이 화성을 덮었다
//  3) 배음이 다른 음 자리에 쌓여 조성을 흐렸다
// 이제 국소 피크만 줍고 포물선 보간으로 주파수를 정밀화하고, 크기는 제곱근으로
// 눌러 큰 소리의 지배를 줄이고, 배음(2·3·4배)을 기본음 쪽으로 되돌려 준다.
function detectKey(buf: AudioBuffer): string {
  const sr = buf.sampleRate;
  const ch = mixToMono(buf);
  const N = 8192, hop = 4096;                      // 50% 겹침 — 프레임 경계에서 음이 안 잘리게
  const maxSamples = Math.min(ch.length, sr * 150);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const chroma = new Array(12).fill(0);
  const re = new Float32Array(N), im = new Float32Array(N);
  const mag = new Float32Array(N / 2);
  for (let start = 0; start + N <= maxSamples; start += hop) {
    for (let i = 0; i < N; i++) { re[i] = ch[start + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    const kLo = Math.max(2, Math.ceil((55 * N) / sr));
    const kHi = Math.min(N / 2 - 2, Math.floor((2000 * N) / sr));
    for (let k = kLo; k <= kHi; k++) {
      // 국소 피크만 — 스펙트럼의 실제 음만 세고 바닥 잡음은 버린다
      if (mag[k] <= mag[k - 1] || mag[k] < mag[k + 1]) continue;
      // 포물선 보간으로 진짜 꼭짓점 위치를 찾는다
      const a = mag[k - 1], b = mag[k], c = mag[k + 1];
      const denom = a - 2 * b + c;
      const delta = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
      const freq = ((k + delta) * sr) / N;
      if (freq < 55 || freq > 2000) continue;
      const w = Math.sqrt(b);                       // 크기 압축
      // 기본음 + 배음 되돌리기: 이 피크가 f/2, f/3, f/4 의 배음일 수 있다
      for (const [div, gain] of [[1, 1], [2, 0.5], [3, 0.33], [4, 0.25]] as const) {
        const f = freq / div;
        if (f < 55) break;
        let pc = Math.round(12 * Math.log2(f / 440) + 69) % 12;
        if (pc < 0) pc += 12;
        chroma[pc] += w * gain;
      }
    }
  }
  return keyFromChroma(chroma);
}

/** chroma 12벡터 → 조성 이름. 순수 함수라 따로 검증한다. */
export function keyFromChroma(chroma: number[]): string {
  const sum = chroma.reduce((x, y) => x + y, 0);
  if (sum === 0) return '';
  const norm = chroma.map((c) => c / sum);
  let best = -2, bestKey = '';
  for (let tonic = 0; tonic < 12; tonic++) {
    const majProf = TEMPERLEY_MAJOR.map((_, i) => TEMPERLEY_MAJOR[(i - tonic + 12) % 12]);
    const minProf = TEMPERLEY_MINOR.map((_, i) => TEMPERLEY_MINOR[(i - tonic + 12) % 12]);
    const cMaj = pearson(norm, majProf);
    const cMin = pearson(norm, minProf);
    if (cMaj > best) { best = cMaj; bestKey = NOTE_NAMES[tonic]; }
    if (cMin > best) { best = cMin; bestKey = NOTE_NAMES[tonic] + 'm'; }
  }
  return bestKey;
}

// f0 추정을 YIN으로 바꿨다. 전엔 단순 자기상관이라 옥타브를 자주 틀렸고
// (한 옥타브 아래가 상관이 더 높게 나오는 건 자기상관의 고질병이다),
// 풀믹스 한 구간(5초)만 봐서 그 구간이 간주면 악기를 목소리로 셌다.
// 이제 (1) 킥·베이스를 고역통과로 걷어내고 (2) 곡 전체에 흩어진 여러 구간을 보고
// (3) YIN 의 누적평균정규화차이로 옥타브 오류를 줄인 뒤 (4) 중앙값을 쓴다.
export function yinF0(frame: Float32Array, sr: number, fMin: number, fMax: number): number {
  const tauMin = Math.max(2, Math.floor(sr / fMax));
  const tauMax = Math.min(Math.floor(frame.length / 2), Math.floor(sr / fMin));
  if (tauMax <= tauMin) return 0;
  const d = new Float32Array(tauMax + 1);
  for (let tau = tauMin; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < frame.length - tau; i++) { const dv = frame[i] - frame[i + tau]; sum += dv * dv; }
    d[tau] = sum;
  }
  // 누적평균정규화 — 이것이 YIN이 자기상관보다 나은 핵심이다
  const dp = new Float32Array(tauMax + 1);
  let running = 0;
  dp[tauMin] = 1;
  for (let tau = tauMin + 1; tau <= tauMax; tau++) {
    running += d[tau];
    dp[tau] = running === 0 ? 1 : (d[tau] * (tau - tauMin + 1)) / running;
  }
  const THRESH = 0.15;
  let tau = -1;
  for (let t = tauMin + 1; t <= tauMax; t++) {
    if (dp[t] < THRESH) {                       // 문턱을 처음 내려가는 골 = 기본 주기
      while (t + 1 <= tauMax && dp[t + 1] < dp[t]) t++;
      tau = t; break;
    }
  }
  if (tau < 0) return 0;
  // 포물선 보간으로 주기를 정밀화
  const x0 = tau > tauMin ? tau - 1 : tau, x2 = tau + 1 <= tauMax ? tau + 1 : tau;
  const denom = dp[x0] - 2 * dp[tau] + dp[x2];
  const better = denom === 0 ? tau : tau + (0.5 * (dp[x0] - dp[x2])) / denom;
  return sr / better;
}

function detectVocal(buf: AudioBuffer): 'male' | 'female' | 'unknown' {
  const sr = buf.sampleRate;
  const mono = mixToMono(buf);
  const x = highpass(mono, sr, 140);            // 킥·베이스 제거
  const fSize = Math.floor(sr * 0.06);
  const pitches: number[] = [];
  // 곡 전체에 흩어진 12개 구간을 본다 — 한 군데가 간주여도 나머지가 받쳐준다
  const WINDOWS = 12, WIN_SEC = 1.5;
  const usable = buf.duration - WIN_SEC;
  if (usable < 1) return 'unknown';
  for (let w = 0; w < WINDOWS; w++) {
    const startSec = (usable * (w + 0.5)) / WINDOWS;
    const s0 = Math.floor(startSec * sr), len = Math.floor(WIN_SEC * sr);
    for (let start = s0; start + fSize < s0 + len && start + fSize < x.length; start += fSize) {
      const frame = x.subarray(start, start + fSize);
      let energy = 0;
      for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
      if (energy / frame.length < 1e-5) continue;   // 무음 프레임은 건너뛴다
      const f = yinF0(frame, sr, 70, 400);
      if (f > 0) pitches.push(f);
    }
  }
  if (pitches.length < 8) return 'unknown';
  pitches.sort((a, b) => a - b);
  const med = pitches[Math.floor(pitches.length / 2)];
  // 남 85~180Hz, 여 165~255Hz — 겹치는 구간은 모른다고 답한다.
  // 풀믹스에서 f0로 성별을 맞히는 건 원리상 한계가 있어서, 애매하면 우기지 않는다.
  if (med < 155) return 'male';
  if (med > 190) return 'female';
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
