import { describe, it, expect } from 'vitest';
import zhTW from './zh-TW.json';
import enUS from './en-US.json';

/**
 * 確保兩種語言的翻譯檔有相同的 key 結構
 * 漏一個 key 會在 runtime 顯示 key 本身（i18next 預設行為）
 * 這條測試在 build 時就抓到遺漏
 */
function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe('i18n locales parity', () => {
  it('zh-TW 和 en-US 有相同的翻譯鍵集合', () => {
    const zhKeys = new Set(getKeys(zhTW as Record<string, unknown>));
    const enKeys = new Set(getKeys(enUS as Record<string, unknown>));
    const onlyInZh = [...zhKeys].filter((k) => !enKeys.has(k)).sort();
    const onlyInEn = [...enKeys].filter((k) => !zhKeys.has(k)).sort();
    expect(onlyInZh, `Keys only in zh-TW: ${onlyInZh.join(', ')}`).toEqual([]);
    expect(onlyInEn, `Keys only in en-US: ${onlyInEn.join(', ')}`).toEqual([]);
  });

  it('zh-TW 至少 80 個翻譯鍵（避免漏抽字串）', () => {
    expect(getKeys(zhTW as Record<string, unknown>).length).toBeGreaterThanOrEqual(80);
  });

  it('zh-TW 包含所有必要區段', () => {
    const requiredSections = [
      'common',
      'nav',
      'home',
      'lobby',
      'gameRoom',
      'resultScreen',
      'moveHistory',
      'roomPreview',
      'profile',
      'leaderboard',
      'games',
      'aiDifficulty',
    ];
    for (const s of requiredSections) {
      expect(zhTW, `Missing section: ${s}`).toHaveProperty(s);
    }
  });

  it('zh-TW 三大遊戲都有 name + loading + stateCorrupted', () => {
    for (const gt of ['tictactoe', 'gomoku', 'reversi']) {
      const g = (zhTW as Record<string, unknown>).games as Record<string, unknown>;
      const game = g[gt] as Record<string, unknown>;
      expect(game.name, `${gt}.name`).toBeTruthy();
      expect(game.loading, `${gt}.loading`).toBeTruthy();
      expect(game.stateCorrupted, `${gt}.stateCorrupted`).toBeTruthy();
    }
  });

  it('zh-TW 不允許單括號插值（i18next 預設用 {{name}}）', () => {
    // IMPROVEMENTS #12 Phase B 踩坑：undo.* 和 replay.* 一開始用單括號，
    // 結果在 UI 顯示「第 {n} 步」而不是「第 3 步」。
    // 統一用 {{name}}，加這條測試防止再犯。
    const keys = getKeys(zhTW as Record<string, unknown>);
    const offenders: string[] = [];
    for (const key of keys) {
      const value = getValueByKeyPath(zhTW, key) as string;
      if (typeof value !== 'string') continue;
      // 排除雙括號干擾後，看是否還有單括號
      const stripped = value.replace(/\{\{[^}]+\}\}/g, '');
      if (/\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(stripped)) {
        offenders.push(key);
      }
    }
    expect(offenders, `Keys using single-brace interpolation: ${offenders.join(', ')}`).toEqual([]);
  });

  it('en-US 不允許單括號插值', () => {
    const keys = getKeys(enUS as Record<string, unknown>);
    const offenders: string[] = [];
    for (const key of keys) {
      const value = getValueByKeyPath(enUS, key) as string;
      if (typeof value !== 'string') continue;
      const stripped = value.replace(/\{\{[^}]+\}\}/g, '');
      if (/\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(stripped)) {
        offenders.push(key);
      }
    }
    expect(offenders, `Keys using single-brace interpolation: ${offenders.join(', ')}`).toEqual([]);
  });
});

/** 用點分路徑取 nested object 裡的字串值 */
function getValueByKeyPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current && typeof current === 'object' && p in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return current;
}
