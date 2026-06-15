import { useEffect, useState, useCallback } from 'react';
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import { setMuted } from '../utils/sound';
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from '../services/settingsService';

/**
 * 套用主題到 <html> 元素（IMPROVEMENTS #18）
 * dark = 加 'dark' class；light = 移除 'dark' class
 */
function applyTheme(theme: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
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

  const setTheme = useCallback((theme: 'dark' | 'light') => {
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
