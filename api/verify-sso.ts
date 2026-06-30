import type { IncomingMessage, ServerResponse } from 'http';
import jwt from 'jsonwebtoken';

/** Vercel Serverless Function 簽名（簡化型別，避免依賴 @vercel/node） */
type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  query?: Record<string, string>;
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/**
 * 鹿陽國小 SSO 驗證 + Firebase Custom Token 簽發
 *
 * 設計：
 * - 用 jsonwebtoken 驗證 SSO 發的 JWT（HS256 + 學校密鑰）
 * - 用同一個 jsonverify 套件手動簽 Firebase Custom Token（RS256 + service account private key）
 * - 不用 firebase-admin SDK（太重、gRPC 會讓 Vercel serverless 載入失敗）
 *
 * Custom Token 格式（Firebase 規範）：
 *   header: { alg: "RS256", typ: "JWT" }
 *   payload: {
 *     iss: serviceAccount.client_email,
 *     sub: serviceAccount.client_email,
 *     aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
 *     iat, exp (1 小時),
 *     uid: "sso:{ssoUid}",
 *     claims: { ssoName, ssoUsername, ssoRole, provider }
 *   }
 *   簽章：用 serviceAccount.private_key 做 RS256
 */

const MISSING_SECRET = 'SSO_JWT_SECRET 環境變數未設定';
const MISSING_SERVICE_ACCOUNT = 'FIREBASE_SERVICE_ACCOUNT 環境變數未設定';
const INVALID_SERVICE_ACCOUNT = 'FIREBASE_SERVICE_ACCOUNT 不是合法 JSON';
const MISSING_PRIVATE_KEY = '服務帳戶金鑰缺少 private_key';

const FIREBASE_CUSTOM_TOKEN_AUD =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const CUSTOM_TOKEN_TTL_SEC = 60 * 60; // 1 小時（Firebase 規範）

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface SSOPayload {
  uid: string;
  username: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

let cachedServiceAccount: ServiceAccount | null = null;

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) return cachedServiceAccount;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error(MISSING_SERVICE_ACCOUNT);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(INVALID_SERVICE_ACCOUNT);
  }

  const sa = parsed as Partial<ServiceAccount>;
  if (!sa.client_email || !sa.private_key) {
    throw new Error(MISSING_PRIVATE_KEY);
  }

  cachedServiceAccount = sa as ServiceAccount;
  return cachedServiceAccount;
}

/** 簽 Firebase Custom Token（手動 RS256） */
function createCustomToken(
  serviceAccount: ServiceAccount,
  uid: string,
  claims: Record<string, unknown>,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: FIREBASE_CUSTOM_TOKEN_AUD,
    iat: now,
    exp: now + CUSTOM_TOKEN_TTL_SEC,
    uid,
    claims,
  };
  // private_key 內容含 \n 跳脫字串（從 JSON 來）；讓 jwt 套件自己處理 PEM 格式
  const key = serviceAccount.private_key.replace(/\\n/g, '\n');
  return jwt.sign(payload, key, { algorithm: 'RS256' });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = req.body && typeof req.body === 'object' ? req.body.token : undefined;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: '缺少 token 參數' });
    return;
  }

  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) {
    console.error('[verify-sso]', MISSING_SECRET);
    res.status(500).json({ error: MISSING_SECRET });
    return;
  }

  // 1. 驗證 SSO JWT
  let payload: SSOPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as SSOPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token 無效';
    console.error('[verify-sso] JWT 驗證失敗', message);
    res.status(401).json({ error: `JWT 驗證失敗：${message}` });
    return;
  }

  // 2. 取得 service account 並簽 custom token
  try {
    const sa = getServiceAccount();
    const firebaseUid = `sso:${payload.uid}`;
    const customClaims = {
      ssoName: payload.name,
      ssoUsername: payload.username,
      ssoRole: payload.role,
      provider: 'luyang-sso',
    };
    const customToken = createCustomToken(sa, firebaseUid, customClaims);

    res.status(200).json({
      customToken,
      user: {
        ssoUid: payload.uid,
        name: payload.name,
        username: payload.username,
        role: payload.role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '發 custom token 失敗';
    console.error('[verify-sso] 服務帳戶/簽章錯誤', message, err);
    res.status(500).json({ error: `Firebase Custom Token 簽發失敗：${message}` });
  }
}