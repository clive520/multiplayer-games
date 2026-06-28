import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';

/**
 * 鹿陽國小單一認證系統（SSO）— Token 驗證 Vercel Serverless Function
 *
 * 流程：
 * 1. 前端從 SSO callback URL 取得 JWT token
 * 2. POST 到此 endpoint /api/verify-sso
 * 3. 此 function 用 SSO_JWT_SECRET 驗證 JWT 簽章 + 過期
 * 4. 用 firebase-admin 建立一個 Custom Token（uid = "sso:{ssoUid}"）
 *    custom claims 含 ssoName（作為 displayName 來源）
 * 5. 回傳 { customToken, user } 給前端
 * 6. 前端用 signInWithCustomToken 登入 Firebase
 *    → Firestore / RTDB 安全規則看到 request.auth.uid = "sso:{ssoUid}"
 *
 * 環境變數（Vercel Dashboard → Settings → Environment Variables）：
 * - SSO_JWT_SECRET：鹿陽國小資訊管理員提供的 JWT 密鑰
 * - FIREBASE_SERVICE_ACCOUNT：Firebase Console > Project Settings > Service Accounts
 *                              點「Generate new private key」下載的 JSON 完整內容（貼成 single-line JSON）
 */

const SSO_URL_NO_SECRET_HINT = 'Missing SSO_JWT_SECRET env var';
const SERVICE_ACCOUNT_HINT = 'Missing FIREBASE_SERVICE_ACCOUNT env var';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (adminApp) return adminApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error(SERVICE_ACCOUNT_HINT);
  }
  const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

  adminApp = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
    },
    'sso-verifier-' + Date.now(),
  );
  return adminApp;
}

interface SSOPayload {
  uid: string;
  username: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // 允許瀏覽器跨來源呼叫（同網域呼叫其實不需要，但 CORS 預檢仍可能發出 OPTIONS）
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
    console.error(SSO_URL_NO_SECRET_HINT);
    res.status(500).json({ error: '伺服器未設定 SSO 密鑰' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as SSOPayload;

    // 建立自訂 Firebase token
    // uid 加 "sso:" 前綴避免與 Google 登入的 Firebase uid 衝突
    const firebaseUid = `sso:${payload.uid}`;
    const customClaims = {
      ssoName: payload.name,
      ssoUsername: payload.username,
      ssoRole: payload.role,
      provider: 'luyang-sso',
    };

    const app = getAdminApp();
    const customToken = await app.auth().createCustomToken(firebaseUid, customClaims);

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
    const message = err instanceof Error ? err.message : 'Token 無效或已過期';
    console.error('[verify-sso] 驗證失敗', message);
    res.status(401).json({ error: message });
  }
}