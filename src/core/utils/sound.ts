/**
 * 音效工具（IMPROVEMENTS #16）
 *
 * 用 Web Audio API 即時合成音效（不用外部 mp3/ogg）
 * 優勢：零額外資源、零授權問題、即時播放
 * 限制：需要使用者互動後才能播放（瀏覽器 autoplay 政策）
 *
 * 提供：
 * - playPop(freq, duration)：簡短正弦波 pop
 * - playChime(notes, gap)：多個音符組成的旋律
 * - setMuted(bool)：全域靜音（給 Settings 切換用）
 */

let audioContext: AudioContext | null = null;
let muted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * 播放一個短促的正弦波 pop
 * - freq：頻率（Hz）；高=亮、低=沉
 * - duration：持續時間（秒）
 * - volume：音量（0~1）
 */
export function playPop(
  freq = 880,
  duration = 0.12,
  volume = 0.18,
): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  // 一些瀏覽器會自動暫停（無使用者互動）；嘗試恢復
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  // 快速衰減：0→volume→0
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

/**
 * 播放一段多音符旋律（給反應或特殊事件用）
 * - notes：每個音的頻率（Hz），依序播放
 * - noteDuration：每個音的長度（秒）
 * - gap：音與音之間的間隔（秒）
 * - volume：音量
 */
export function playChime(
  notes: ReadonlyArray<number>,
  noteDuration = 0.18,
  gap = 0.02,
  volume = 0.18,
): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  let t = ctx.currentTime + 0.02;
  for (const freq of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + noteDuration + 0.02);
    t += noteDuration + gap;
  }
}

/** 設定全域靜音（給 Settings 切換用） */
export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

/** 預設反應音效（每個 emoji 配一個不同音高） */
export const REACTION_SOUNDS = {
  cheer: () => playPop(660, 0.12),       // 軟高音
  congrats: () => playChime([523, 659, 784], 0.1, 0.01), // 上行三音
  surprise: () => playPop(440, 0.18),    // 較低
  respect: () => playPop(880, 0.12),     // 亮高音
  encourage: () => playChime([523, 659], 0.1, 0.01), // 上行二音
} as const;
