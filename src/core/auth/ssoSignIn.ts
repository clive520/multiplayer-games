import { signInWithCustomToken, type User } from 'firebase/auth';
import { auth } from './firebaseInstances';

/**
 * 鹿陽國小 SSO 登入流程
 *
 * 流程：
 * 1. redirectToSSO()：導向 SSO 登入頁（帶 return_url）
 * 2. SSO 完成登入 → 導回 /auth/sso/callback?token=JWT
 * 3. signInWithSSOToken(token)：POST 到 /api/verify-sso 驗證 + 取得 customToken
 * 4. signInWithCustomToken(auth, customToken) 登入 Firebase
 * 5. AuthProvider 偵測到 user 登入 + custom claims 有 ssoName → 設定 nickname 為 ssoName
 */

const SSO_LOGIN_URL = 'https://sso-auth-system.web.app/';

/**
 * 取得當前網站的 callback 網址
 * - production：https://githubtest-blond.vercel.app/auth/sso/callback
 * - local dev：http://localhost:5173/auth/sso/callback
 */
function getCallbackUrl(): string {
  if (typeof window === 'undefined') return '';
  const { origin } = window.location;
  return `${origin}/auth/sso/callback`;
}

export function redirectToSSO(): void {
  const callback = getCallbackUrl();
  const encoded = encodeURIComponent(callback);
  window.location.href = `${SSO_LOGIN_URL}?return_url=${encoded}`;
}

export interface SSOVerifyResult {
  customToken: string;
  user: {
    ssoUid: string;
    name: string;
    username: string;
    role: string;
  };
}

/**
 * 把 SSO 提供的 JWT 送到後端驗證，取得 Firebase Custom Token 後登入
 */
export async function signInWithSSOToken(token: string): Promise<User> {
  const res = await fetch('/api/verify-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '未知錯誤' }));
    throw new Error(data.error ?? 'SSO 驗證失敗');
  }

  const { customToken } = (await res.json()) as SSOVerifyResult;
  const credential = await signInWithCustomToken(auth, customToken);
  return credential.user;
}

/**
 * 判斷目前 user 是否透過 SSO 登入
 * （uid 開頭 "sso:" 或 custom claims 有 provider=luyang-sso）
 */
export function isSSOUser(user: User | null): boolean {
  if (!user) return false;
  return user.uid.startsWith('sso:');
}