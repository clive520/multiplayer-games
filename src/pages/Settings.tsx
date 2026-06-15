import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../core/components/LanguageSwitcher';
import { useSettings } from '../core/hooks/useSettings';
import { useAuth } from '../core/auth/useAuth';
import { signOut } from '../core/auth/googleSignIn';

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings, setMuted, setLanguage, setTheme, supportedLanguages } = useSettings();

  return (
    <div className="mx-auto min-h-screen max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => navigate('/lobby')}
            className="rounded dark:bg-slate-700 bg-slate-200 px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-slate-300"
          >
            {t('settings.backToLobby')}
          </button>
        </div>
      </header>

      {/* 音效區塊 */}
      <section className="mb-6 rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold dark:text-slate-300 text-slate-700">{t('settings.sectionSound')}</h2>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium dark:text-white text-slate-900">{t('settings.muted')}</p>
            <p className="text-xs text-slate-500">{t('settings.mutedHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.muted}
            onClick={() => setMuted(!settings.muted)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              settings.muted ? 'dark:bg-slate-600 bg-slate-300' : 'bg-blue-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                settings.muted ? 'translate-x-0' : 'translate-x-5'
              }`}
            />
          </button>
        </label>
      </section>

      {/* 語言區塊 */}
      <section className="mb-6 rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold dark:text-slate-300 text-slate-700">{t('settings.sectionLanguage')}</h2>
        <div>
          <p className="mb-1 text-sm font-medium dark:text-white text-slate-900">{t('settings.language')}</p>
          <p className="mb-3 text-xs text-slate-500">{t('settings.languageHint')}</p>
          <div className="flex flex-wrap gap-2">
            {supportedLanguages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  settings.language === lang
                    ? 'bg-blue-600 dark:text-white text-slate-900'
                    : 'dark:bg-slate-700 bg-slate-200 dark:text-slate-300 text-slate-700 hover:dark:bg-slate-600 bg-slate-300'
                }`}
              >
                {lang === 'zh-TW' ? '繁體中文' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 顯示區塊（主題 — IMPROVEMENTS #18） */}
      <section className="mb-6 rounded-lg border border-slate-700 dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold dark:text-slate-300 text-slate-700">
          {t('settings.sectionDisplay')}
        </h2>
        <div>
          <p className="mb-1 text-sm font-medium dark:text-white text-slate-900">
            {t('settings.theme')}
          </p>
          <p className="mb-3 text-xs dark:text-slate-500 text-slate-500">
            {t('settings.themeHint')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                settings.theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'dark:bg-slate-700 bg-slate-200 dark:text-white text-slate-900 hover:dark:bg-slate-600 hover:bg-slate-300'
              }`}
            >
              {t('settings.themeDark')}
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                settings.theme === 'light'
                  ? 'bg-blue-600 text-white'
                  : 'dark:bg-slate-700 bg-slate-200 dark:text-white text-slate-900 hover:dark:bg-slate-600 hover:bg-slate-300'
              }`}
            >
              {t('settings.themeLight')}
            </button>
          </div>
        </div>
      </section>

      {/* 帳號區塊（如果有登入就顯示登出） */}
      {user && (
        <section className="mb-6 rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold dark:text-slate-300 text-slate-700">帳號</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm dark:text-slate-300 text-slate-700">
              {user.email ?? user.displayName ?? user.uid}
            </p>
            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="rounded dark:bg-slate-700 bg-slate-200 px-3 py-1.5 text-sm dark:text-slate-200 text-slate-800 hover:dark:bg-slate-600 bg-slate-300"
            >
              {t('nav.signOut')}
            </button>
          </div>
        </section>
      )}

      <p className="text-center text-xs text-slate-500">{t('settings.autoSaved')}</p>
    </div>
  );
}
