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

  // 把回應內容讀出來，不論成功失敗都要看
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // 不是 JSON：可能是 Vercel 的 HTML 錯誤頁
  }

  if (!res.ok) {
    let msg = '未知錯誤';
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      msg = String((parsed as { error: string }).error);
    } else if (text) {
      // 截斷 HTML 錯誤頁前 200 字當訊息
      msg = text.length > 200 ? text.slice(0, 200) + '...' : text;
    }
    console.error('[SSO] API 回應', res.status, text);
    throw new Error(msg);
  }

  if (!parsed || typeof parsed !== 'object' || !('customToken' in parsed)) {
    console.error('[SSO] 回應沒有 customToken', text);
    throw new Error('API 回應格式錯誤');
  }

  const { customToken } = parsed as SSOVerifyResult;
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