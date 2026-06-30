import { useState } from 'react';
import { useAuth } from '../core/auth/useAuth';
import { signInWithGoogle, signOut } from '../core/auth/googleSignIn';
import { redirectToSSO } from '../core/auth/ssoSignIn';
import { signInAsGuest } from '../core/auth/guestSignIn';
import { useToast } from '../core/components/Toast';
import { LanguageSwitcher } from '../core/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestNickname, setGuestNickname] = useState('');
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestPending, setGuestPending] = useState(false);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(t('errors.signInFailed'), err);
      toast.error(t('home.signInFailed'));
    }
  };

  const handleSSOSignIn = () => {
    redirectToSSO();
  };

  const handleGuestSubmit = async () => {
    setGuestError(null);
    setGuestPending(true);
    try {
      await signInAsGuest(guestNickname);
      toast.success(t('home.guestWelcome', { name: guestNickname.trim() }));
      setShowGuestModal(false);
      setGuestNickname('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登入失敗';
      setGuestError(msg);
    } finally {
      setGuestPending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign-out failed', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <h1 className="text-4xl font-bold">{t('home.title')}</h1>
      <p className="dark:text-slate-400 text-slate-600">{t('home.subtitle')}</p>

      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 shadow-lg">
        {user ? (
          <div className="flex flex-col items-center gap-4">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'avatar'}
                className="h-16 w-16 rounded-full"
              />
            )}
            <div className="text-center">
              <p className="text-xs text-slate-500">{t('home.signedInAs', { name: user.displayName ?? '' })}</p>
              <p className="text-sm dark:text-slate-400 text-slate-600">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded dark:bg-slate-700 bg-app-hover px-4 py-2 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
            >
              {t('home.signOut')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleSignIn}
              className="rounded bg-blue-600 px-6 py-3 font-medium dark:text-white text-slate-900 hover:bg-blue-500"
            >
              {t('home.signIn')}
            </button>
            <div className="my-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-px w-10 bg-slate-300 dark:bg-slate-600" />
              {t('home.or')}
              <span className="h-px w-10 bg-slate-300 dark:bg-slate-600" />
            </div>
            <button
              onClick={handleSSOSignIn}
              className="rounded bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
            >
              {t('home.signInSSO')}
            </button>
            <div className="my-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-px w-10 bg-slate-300 dark:bg-slate-600" />
              {t('home.or')}
              <span className="h-px w-10 bg-slate-300 dark:bg-slate-600" />
            </div>
            <button
              onClick={() => {
                setGuestError(null);
                setShowGuestModal(true);
              }}
              className="rounded bg-slate-600 px-6 py-3 font-medium text-white hover:bg-slate-500"
            >
              {t('home.signInGuest')}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Firebase 連接狀態：{user ? '已連線' : '未登入'}
      </p>

      {/* 訪客登入 Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold dark:text-white text-slate-900">
              {t('home.guestTitle')}
            </h2>
            <p className="mb-4 text-sm dark:text-slate-400 text-slate-600">
              {t('home.guestSubtitle')}
            </p>

            <input
              type="text"
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
              placeholder={t('home.guestPlaceholder')}
              maxLength={12}
              minLength={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !guestPending && guestNickname.trim()) {
                  handleGuestSubmit();
                }
              }}
              className="mb-2 w-full rounded border dark:border-slate-600 border-app-border dark:bg-slate-900 bg-white px-3 py-2 text-sm dark:text-white text-slate-900"
            />
            {guestError && (
              <p className="mb-2 text-xs text-red-500">{guestError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowGuestModal(false)}
                className="rounded dark:bg-slate-700 bg-app-hover px-4 py-2 text-sm dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGuestSubmit}
                disabled={guestPending || !guestNickname.trim()}
                className="rounded bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 disabled:opacity-50"
              >
                {guestPending ? t('common.loading') : t('home.guestStart')}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t('home.guestWarning')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
