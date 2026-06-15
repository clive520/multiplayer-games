import { useAuth } from '../core/auth/useAuth';
import { signInWithGoogle, signOut } from '../core/auth/googleSignIn';
import { useToast } from '../core/components/Toast';
import { LanguageSwitcher } from '../core/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(t('errors.signInFailed'), err);
      toast.error(t('home.signInFailed'));
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
        <p className="text-slate-400">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <h1 className="text-4xl font-bold">{t('home.title')}</h1>
      <p className="text-slate-400">{t('home.subtitle')}</p>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-lg">
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
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
            >
              {t('home.signOut')}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="rounded bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500"
          >
            {t('home.signIn')}
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Firebase 連接狀態：{user ? '已連線' : '未登入'}
      </p>
    </div>
  );
}
