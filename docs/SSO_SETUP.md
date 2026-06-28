# 鹿陽國小 SSO 介接設定指南

> 把遊戲網站接上「鹿陽國小單一認證系統」（SSO），讓學生用學校帳號登入。

---

## 一、整體流程

```
學生                       你的網站                       鹿陽 SSO 系統              Firebase Auth
  │                           │                              │                        │
  │ 1. 點「鹿陽國小登入」       │                              │                        │
  │ ────────────────────────> │                              │                        │
  │                           │ 2. redirect                  │                        │
  │                           │ ────────────────────────────> │                        │
  │ 3. 輸入帳密               │                              │                        │
  │ ────────────────────────────────────────────────────────── > │                        │
  │                           │ 4. callback ?token=JWT        │                        │
  │                           │ <────────────────────────── │                        │
  │                           │ 5. POST /api/verify-sso        │                        │
  │                           │ ─ verifies JWT with secret ─> │                        │
  │                           │ 6. 用 firebase-admin 建自訂 token                        │
  │                           │ 7. signInWithCustomToken()  ─────────────────────> │
  │                           │                              │                        │
  │ 8. 進入遊戲（uid = "sso:{ssoUid}"，nickname = SSO 中文姓名） │                        │
```

---

## 二、需要設定的兩個環境變數（Vercel Dashboard）

到 Vercel → 你的 project (`githubtest`) → Settings → Environment Variables：

### 1. `SSO_JWT_SECRET`

鹿陽國小資訊管理員提供的 JWT 密鑰。

```
Name:  SSO_JWT_SECRET
Value: 08bc38df41c2e5e557a95554faab585f9878ca4554993c906689fcf8082051420534d15d9fba9d751d3da2a2b08d9f14
Environments: ☑ Production  ☑ Preview  ☑ Development
```

### 2. `FIREBASE_SERVICE_ACCOUNT`

Firebase Admin SDK 用來發 custom token 的服務帳戶金鑰。

**下載步驟：**

1. 進 [Firebase Console](https://console.firebase.google.com/) → 選你的專案 (`multiplayer-games-73a8f`)
2. 齒輪 ⚙️ → 專案設定 → 服務帳戶 分頁
3. 點 **「產生新的私人金鑰」**(Generate new private key) → 下載一個 `.json` 檔
4. 用文字編輯器打開 JSON，內容長這樣：

   ```json
   {
     "type": "service_account",
     "project_id": "multiplayer-games-73a8f",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@multiplayer-games-73a8f.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
   }
   ```

5. **整份 JSON 內容**貼到 Vercel 環境變數（不要格式化、不要轉譯）：

   ```
   Name:  FIREBASE_SERVICE_ACCOUNT
   Value: { 整個上面那份 JSON 原封不動貼進去 }
   Environments: ☑ Production (Preview/Development 可不選，避免本機 debug 用到)
   ```

> ⚠️ **此金鑰等同於管理員權限**，請不要 commit 到 git、不要外流。.env.local 已加入 .gitignore。

---

## 三、設定 Firebase Auth 白名單網域

由於 SSO callback 走的是自訂路由（不是 Firebase Auth popup），**不需要再加新網域**到 Firebase Authorized domains。
（用 `signInWithCustomToken` 登入不會被網域擋）

但如果你要保留 Google 登入選項，確認預覽網域也在白名單（見 `docs/SOP.md`）。

---

## 四、部署到 Vercel後測試

1. push commit 後 Vercel 會自動重新部署
2. 等綠燈，到 https://githubtest-blond.vercel.app/
3. 看到首頁出現兩個按鈕：
   - 「使用 Google 帳號登入」（藍色，原本的）
   - 「鹿陽國小單一認證登入」（綠色，新的）
4. 點綠色按鈕 → 跳到鹿陽 SSO
5. 學生輸入帳密 → SSO 跳回 `/auth/sso/callback?token=...`
6. 後端驗證 token、發 custom token → 前端 `signInWithCustomToken()`
7. 自動跳回首頁，看到學生 chinese name（中文名字）

---

## 五、異常排查

| 症狀 | 可能原因 | 處理 |
|---|---|---|
| 點綠色按鈕後 SSO 頁 404 | SSO 還沒給你正確的登入頁 URL | 確認 `sso-auth-system.web.app` 是學校跟你講的網址 |
| callback 後 `SSO 驗證失敗` (401) | JWT 過期 / 密鑰不對 | 確認 `SSO_JWT_SECRET` 與學校給的字串**完全一樣**（含大小寫）|
| callback 後 `伺服器未設定 SSO 密鑰` (500) | Vercel env var 沒設 / 沒重新部署 | 到 Vercel Settings > Environment Variables 確認 `SSO_JWT_SECRET` 存在，並 Redeploy |
| callback 後 Firebase 登入失敗 `auth/invalid-custom-token` | Service Account 不對 / Verifications 有誤 | 重新下載 service account key，重貼 `FIREBASE_SERVICE_ACCOUNT` |
| 學生 nickname 仍顯示「玩家N」 | 首次登入時 updateNickname 被規則擋掉 | 檢查 Firestore rules：`update` 允許 `isSelf(uid)` 應該通得過 |

---

## 六、自訂修改指南

| 想改什麼 | 改哪 |
|---|---|
| 只允許 student 角色登入 | `api/verify-sso.ts` 解 `payload.role` 後加 `if (payload.role !== 'student') return res.status(403).json({ error: '僅限學生登入' })` |
| 改「鹿陽國小登入」按鈕文字 | `src/core/i18n/locales/{zh-TW,en-US}.json` → `home.signInSSO` |
| 改 callback 路徑 | `src/core/auth/ssoSignIn.ts` 的 `getCallbackUrl` 與 `src/App.tsx` 的 Route `path` |
| 改 SSO 登入頁 URL | `src/core/auth/ssoSignIn.ts` 的 `SSO_LOGIN_URL` 常數 |

---

*文件版本：v1.0 | 介接於 2026 年 6 月*