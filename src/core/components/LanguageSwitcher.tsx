import { useTranslation } from 'react-i18next';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../i18n';

/**
 * 語言切換器（IMPROVEMENTS #5a）
 * 極簡設計：下拉選單
 * 切換後會自動寫 localStorage（i18next-browser-languagedetector 處理）
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'zh-TW') as SupportedLanguage;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as SupportedLanguage;
    void i18n.changeLanguage(next);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="Language"
      className="rounded border dark:border-slate-600 border-app-border-strong dark:bg-slate-800 bg-app-card px-2 py-1 text-xs dark:text-slate-200 text-slate-800 hover:dark:bg-slate-700 bg-app-hover focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </option>
      ))}
    </select>
  );
}
