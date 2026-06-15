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
// 注意：LanguageDetector 在 Node 環境會 throw（localStorage 不可用），
// 所以只在瀏覽器環境才掛載
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const initPromise = i18n
  .use(isBrowser ? LanguageDetector : (initReactI18next as never))
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      'en-US': { translation: enUS },
    },
    // 預設中文（用戶沒偏好時）；changeLanguage 會覆寫
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    detection: isBrowser
      ? {
          order: ['localStorage', 'navigator', 'htmlTag'],
          lookupLocalStorage: 'multiplayer-games-lang',
          caches: ['localStorage'],
        }
      : undefined,
    interpolation: { escapeValue: false },
    debug: false,
    // ⚠️ 重要：不加 nonExplicitSupportedLngs: true
    // 經測試，加了會壞掉（t() 會回傳原始 key，不翻譯）
    // 不加的話：瀏覽器若 'en' 會 fallback 到 fallbackLng='zh-TW'，OK
    // 用戶可在 header 手動切換到 en-US
    // 避免 Suspense fallback 顯示原始 key
    react: { useSuspense: false },
  });

/** 等待 i18n 初始化完成（main.tsx 必須 await 才不會 render 到 key） */
export const initI18n: Promise<void> = initPromise.then(() => undefined);

export default i18n;
