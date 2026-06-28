import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
// firebase-admin 是 CommonJS；用 require 確保拿到完整物件
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin') as typeof import('firebase-admin');

/**
 * 鹿陽國小單一認證系統（SSO）— Token 驗證 Vercel Serverless Function
 *
 * 環境變數（Vercel Dashboard → Settings → Environment Variables）：
 * - SSO_JWT_SECRET：鹿陽國小資訊管理員提供的 JWT 密鑰
 * - FIREBASE_SERVICE_ACCOUNT：Firebase Console > Project Settings > Service Accounts
 *                              點「Generate new private key」下載的 JSON 完整內容
 */

const MISSING_SECRET = 'SSO_JWT_SECRET 環境變數未設定';
const MISSING_SERVICE_ACCOUNT = 'FIREBASE_SERVICE_ACCOUNT 環境變數未設定';
const INVALID_SERVICE_ACCOUNT = 'FIREBASE_SERVICE_ACCOUNT 不是合法 JSON';

// Vercel Serverless 可能 warm reuse — 用 globalThis 持久化 admin app
interface GlobalWithAdmin {
  __ssoAdminApp?: admin.app.App;
}
const g = globalThis as unknown as GlobalWithAdmin;

function getAdminApp(): admin.app.App {
  if (g.__ssoAdminApp) return g.__ssoAdminApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error(MISSING_SERVICE_ACCOUNT);
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error(INVALID_SERVICE_ACCOUNT);
  }

  // 處理 warm instance 造成「app already exists」
  try {
    g.__ssoAdminApp = admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
      },
      'sso-verifier',
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('already exists') || msg.includes('EXISTING_APP')) {
      g.__ssoAdminApp = admin.app('sso-verifier');
    } else {
      throw err;
    }
  }
  return g.__ssoAdminApp;
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

  // 1. JWT 驗證
  let payload: SSOPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as SSOPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token 無效或已過期';
    console.error('[verify-sso] JWT 驗證失敗', message);
    res.status(401).json({ error: `JWT 驗證失敗：${message}` });
    return;
  }

  // 2. 用 firebase-admin 建 custom token
  try {
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
    const message = err instanceof Error ? err.message : 'firebase-admin 失敗';
    console.error('[verify-sso] firebase-admin 錯誤', message, err);
    res.status(500).json({ error: `Firebase Admin 失敗：${message}` });
  }
}