import { useEffect, useState, useCallback } from 'react';
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { setMuted } from '../utils/sound';
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  THEME_IDS,
  type AppSettings,
  type ThemeId,
} from '../services/settingsService';

/**
 * 套用主題到 <html> 元素（IMPROVEMENTS #18 多主題）
 *
 * 主題分類：
 * - 'dark'：加 'dark' class（CSS 變數無效，dark: 前綴生效）
 * - 'coffee'：移除 'dark' + 移除 'theme-X'（用 :root 預設 = 淺咖啡）
 * - 'green'：移除 'dark' + 加 'theme-green'（CSS 變數覆寫為綠色）
 *
 * 之後加新主題（藍/紫/...）只要在 :root 加 .theme-X 區塊並在此判斷。
 * 順便清掉舊的 theme-X class，避免殘留。
 */
function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  // 移除所有主題 class（dark + theme-X），再依 theme 加回去
  html.classList.remove('dark');
  for (const id of THEME_IDS) {
    if (id !== 'dark') html.classList.remove(`theme-${id}`);
  }
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'green') {
    html.classList.add('theme-green');
  }
  // 'coffee' = 預設淺色，無需加 class
}

/**
 * 應用程式偏好 hook（IMPROVEMENTS #17 設定頁）
 *
 * 開機時從 localStorage 載入，setX() 自動持久化 + 套用副作用（語言/音效/主題）
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // 開機時從 localStorage 載入
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    // 套用副作用
    setMuted(loaded.muted);
    applyTheme(loaded.theme);
    if (i18n.language !== loaded.language) {
      void i18n.changeLanguage(loaded.language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMutedSetting = useCallback((muted: boolean) => {
    setMuted(muted);
    setSettings((prev) => {
      const next = { ...prev, muted };
      saveSettings(next);
      return next;
    });
  }, []);

  const setLanguage = useCallback((language: SupportedLanguage) => {
    void i18n.changeLanguage(language);
    setSettings((prev) => {
      const next = { ...prev, language };
      saveSettings(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: ThemeId) => {
    applyTheme(theme);
    setSettings((prev) => {
      const next = { ...prev, theme };
      saveSettings(next);
      return next;
    });
  }, []);

  return {
    settings,
    setMuted: setMutedSetting,
    setLanguage,
    setTheme,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
