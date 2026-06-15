/**
 * 應用程式偏好設定（IMPROVEMENTS #17 設定頁）
 *
 * 集中儲存用戶偏好：
 * - muted：音效靜音（IMPROVEMENTS #16）
 * - language：介面語言（IMPROVEMENTS #5a）
 * - theme：主題，未來 #18 用
 *
 * 儲存策略：localStorage（單一 key 'multiplayer-games-settings'，JSON 序列化）
 * 讀取時做 try/catch（localStorage 可能被禁用/壞掉）
 */

import type { SupportedLanguage } from '../i18n';

export interface AppSettings {
  /** 音效靜音（true = 靜音） */
  muted: boolean;
  /** 介面語言 */
  language: SupportedLanguage;
  /** 主題（dark/light），目前永遠 dark；保留欄位給 #18 */
  theme: 'dark' | 'light';
}

export const DEFAULT_SETTINGS: AppSettings = {
  muted: false,
  language: 'zh-TW',
  theme: 'dark',
};

const STORAGE_KEY = 'multiplayer-games-settings';

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'zh-TW' || value === 'en-US';
}

function isValidTheme(value: unknown): value is 'dark' | 'light' {
  return value === 'dark' || value === 'light';
}

/** 從 localStorage 讀取設定；失敗或無資料時回傳 DEFAULT */
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
      language: isSupportedLanguage(parsed.language) ? parsed.language : DEFAULT_SETTINGS.language,
      theme: isValidTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 寫入 localStorage；失敗時靜默（不擋 UI） */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 滿了或被禁用，忽略
  }
}

/** 合併部分更新到現有設定並儲存（給 Settings 頁用） */
export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = { ...loadSettings(), ...partial };
  saveSettings(merged);
  return merged;
}
