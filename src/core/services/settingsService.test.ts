import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  updateSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from './settingsService';

// 建一個完整的 localStorage mock（有 clear/getItem/setItem/removeItem）
function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

beforeEach(() => {
  // 注入完整 localStorage mock 到 window
  // 必須在每個 test 重新設定（i18next 會亂改 window.localStorage）
  const ls = createMockLocalStorage();
  // @ts-expect-error - 模擬 window.localStorage
  globalThis.window = { ...globalThis.window, localStorage: ls };
});

describe('settingsService', () => {
  it('無儲存資料時回傳 DEFAULT', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saveSettings 後 loadSettings 回傳相同資料', () => {
    const data: AppSettings = { muted: true, language: 'en-US', theme: 'light' };
    saveSettings(data);
    expect(loadSettings()).toEqual(data);
  });

  it('updateSettings 合併部分更新', () => {
    saveSettings({ muted: false, language: 'zh-TW', theme: 'dark' });
    const updated = updateSettings({ muted: true });
    expect(updated.muted).toBe(true);
    expect(updated.language).toBe('zh-TW');
    expect(updated.theme).toBe('dark');
  });

  it('壞資料時回傳 DEFAULT（防 crash）', () => {
    window.localStorage.setItem('multiplayer-games-settings', '{not valid json}');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('不支援的 language 會 fallback 到 DEFAULT', () => {
    window.localStorage.setItem(
      'multiplayer-games-settings',
      JSON.stringify({ muted: false, language: 'fr-FR', theme: 'dark' })
    );
    const loaded = loadSettings();
    expect(loaded.language).toBe(DEFAULT_SETTINGS.language);
  });

  it('缺欄位時用 DEFAULT 補', () => {
    window.localStorage.setItem(
      'multiplayer-games-settings',
      JSON.stringify({ muted: true })
    );
    const loaded = loadSettings();
    expect(loaded.muted).toBe(true);
    expect(loaded.language).toBe(DEFAULT_SETTINGS.language);
    expect(loaded.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('localStorage 拋例外時 saveSettings 靜默（不擋 UI）', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
    spy.mockRestore();
  });
});
