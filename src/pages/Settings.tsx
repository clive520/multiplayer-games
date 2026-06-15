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
  const { settings, setMuted, setLanguage, supportedLanguages } = useSettings();

  return (
    <div className="mx-auto min-h-screen max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => navigate('/lobby')}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            {t('settings.backToLobby')}
          </button>
        </div>
      </header>

      {/* 音效區塊 */}
      <section className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">{t('settings.sectionSound')}</h2>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">{t('settings.muted')}</p>
            <p className="text-xs text-slate-500">{t('settings.mutedHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.muted}
            onClick={() => setMuted(!settings.muted)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              settings.muted ? 'bg-slate-600' : 'bg-blue-600'
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
      <section className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">{t('settings.sectionLanguage')}</h2>
        <div>
          <p className="mb-1 text-sm font-medium text-white">{t('settings.language')}</p>
          <p className="mb-3 text-xs text-slate-500">{t('settings.languageHint')}</p>
          <div className="flex flex-wrap gap-2">
            {supportedLanguages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  settings.language === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {lang === 'zh-TW' ? '繁體中文' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 顯示區塊（主題 — 淺色模式待 #18） */}
      <section className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">{t('settings.sectionDisplay')}</h2>
        <div>
          <p className="mb-1 text-sm font-medium text-white">{t('settings.theme')}</p>
          <p className="mb-3 text-xs text-slate-500">{t('settings.themeHint')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-100"
            >
              {t('settings.themeDark')}
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-500 opacity-60"
              title={t('settings.themeHint')}
            >
              {t('settings.themeLight')}
            </button>
          </div>
        </div>
      </section>

      {/* 帳號區塊（如果有登入就顯示登出） */}
      {user && (
        <section className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">帳號</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">
              {user.email ?? user.displayName ?? user.uid}
            </p>
            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
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
