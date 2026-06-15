/**
 * i18n 設定（IMPROVEMENTS #5a）
 *
 * 偵測順序（IMPROVEMENTS 決議）：
 *   1. localStorage（記住使用者偏好）
 *   2. 瀏覽器語系
 *   3. 預設 zh-TW
 *
 * 用法：
 *   import { useTranslation } from 'react-i18next';
 *   const { t, i18n } = useTranslation();
 *   t('lobby.title')          // 純字串
 *   t('home.welcome', { name })  // 插值
 *   i18n.changeLanguage('en-US')  // 切換語言（會自動寫 localStorage）
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';

export const SUPPORTED_LANGUAGES = ['zh-TW', 'en-US'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'zh-TW': '繁體中文',
  'en-US': 'English',
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-TW';

// 直接捕捉 init 傳回的 promise（不再用 void 忽略錯誤）
const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      'en-US': { translation: enUS },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    detection: {
      // 偵測順序：localStorage > navigator > htmlTag
      order: ['localStorage', 'navigator', 'htmlTag'],
      // localStorage key（給將來想清掉的時候好找）
      lookupLocalStorage: 'multiplayer-games-lang',
      caches: ['localStorage'],
    },
    interpolation: {
      // React 預設就 escape，避免 XSS；不關掉
      escapeValue: false,
    },
    // 開發模式顯示 console 警告（缺 key 之類）
    debug: false,
    // 偵測到非支援語言（eg. en）時，fallback 到 zh-TW
    nonExplicitSupportedLngs: true,
    // 關鍵修正：react-i18next 預設 useSuspense: true
    // 沒包 Suspense 邊界時會 fallback 到 key 字串
    // 改 false：t() 會回傳 key（直到 init 完成），但至少不 crash
    // 搭配 main.tsx 的 await initI18n，確保 init 完成才 render
    react: {
      useSuspense: false,
    },
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[i18n] init 失敗', err);
    throw err;
  });

/** 等待 i18n 初始化完成（main.tsx 必須 await 才不會 render 到 key） */
export const initI18n: Promise<void> = initPromise.then(() => undefined);

export default i18n;
