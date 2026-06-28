import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithSSOToken } from '../core/auth/ssoSignIn';

/**
 * SSO Callback 頁面
 *
 * 流程：
 * 1. 從 URL ?token=... 取得 JWT
 * 2. POST 到 /api/verify-sso 驗證 + 取 Firebase Custom Token
 * 3. signInWithCustomToken 登入 Firebase
 * 4. 清掉 URL 中的 token（避免洩漏到瀏覽器歷史）
 * 5. 跳轉回首頁
 */
export default function SSOCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError(t('sso.missingToken'));
      return;
    }

    signInWithSSOToken(token)
      .then(() => {
        // 清掉 URL 中的 token（避免留在瀏覽器歷史）
        window.history.replaceState({}, '', window.location.pathname);
        navigate('/');
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : '登入失敗';
        setError(msg);
      });
  }, [navigate, t]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-red-500">{t('sso.loginFailed')}</p>
        <p className="text-sm dark:text-slate-400 text-slate-600">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="dark:text-slate-400 text-slate-600">{t('sso.processing')}</p>
    </div>
  );
}