# 部署指南

> 最後更新：2026-06-12

本文件說明如何把多人遊戲網站部署到正式環境。我們提供兩個選項：
- **Vercel**（推薦，零設定，自動部署）
- **Firebase Hosting**（與 Firebase 後端整合最佳）
- **GitHub Pages**（免費但需要手動處理 SPA 路由）

---

## 選項 A：Vercel（推薦）

### 為什麼選 Vercel
- 零設定（自動偵測 Vite）
- 自動 HTTPS、CDN
- 每次 `git push` 自動部署
- 支援 SPA 路由（已預先設定 `vercel.json`）
- 免費額度足夠個人/小團隊使用

### 部署步驟

#### 1. 建立 Vercel 帳號
到 https://vercel.com/ 用 GitHub 帳號登入

#### 2. 匯入專案
- 點 **「Add New → Project」**
- 選擇 `clive520/multiplayer-games` repo
- 點 **Import**

#### 3. 設定環境變數
在部署設定頁面，展開 **Environment Variables**，加入：

| 變數名稱 | 範例值 | 環境 |
|---------|--------|------|
| `VITE_FIREBASE_API_KEY` | 從 Firebase Console 複製 | Production, Preview |
| `VITE_FIREBASE_AUTH_DOMAIN` | 你的專案.firebaseapp.com | Production, Preview |
| `VITE_FIREBASE_PROJECT_ID` | 你的專案 ID | Production, Preview |
| `VITE_FIREBASE_STORAGE_BUCKET` | 你的專案.appspot.com | Production, Preview |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 純數字 | Production, Preview |
| `VITE_FIREBASE_APP_ID` | 1:xxx:web:xxx | Production, Preview |
| `VITE_FIREBASE_DATABASE_URL` | https://xxx-default-rtdb.firebaseio.com | Production, Preview |

#### 4. 部署
- 點 **Deploy**
- 等 1-2 分鐘
- 拿到 Vercel 網址（`https://multiplayer-games-xxx.vercel.app`）

#### 5. 設定 Firebase 授權網域
到 Firebase Console → Authentication → Settings → Authorized Domains
加入你的 Vercel 網域（例如 `multiplayer-games-xxx.vercel.app`）

---

## 選項 B：Firebase Hosting

### 1. 安裝 Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. 登入
```bash
firebase login
```

### 3. 部署規則與網站
```bash
# 部署 Firestore 規則
firebase deploy --only firestore:rules

# 部署 Realtime Database 規則
firebase deploy --only database

# 部署網站
npm run build
firebase deploy --only hosting
```

### 4. 環境變數
`.env.local` 已經在本地用，部署到 Firebase Hosting 時：
- 用 `.env.production`（或類似的 Vite 環境檔）
- 或用 Firebase Functions 的 environment config

---

## 選項 C：GitHub Pages

### 1. 修改 Vite 設定
在 `vite.config.ts` 加入 base：
```ts
export default defineConfig({
  base: '/multiplayer-games/',
  // ... 其他設定
});
```

### 2. 處理 SPA 路由
GitHub Pages 不支援 client-side routing fallback。需要：
- 將 `BrowserRouter` 改為 `HashRouter`（最簡單）
- 或新增 `404.html` 並在 `index.html` 加入 redirect 腳本

**推薦用 HashRouter**：
```ts
// src/main.tsx
import { HashRouter } from 'react-router-dom';
// ... 把 BrowserRouter 換成 HashRouter
```

### 3. 部署流程
建立 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # ... 其他 secrets
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
```

在 GitHub repo 設定 → Secrets and variables → Actions 加入所有 VITE_* 變數。

---

## 部署後檢查清單

- [ ] 網站可開啟
- [ ] Google 登入按鈕可運作
- [ ] Firebase 授權網域已加入正式網域
- [ ] Firestore / RTDB 規則已從測試模式改為正式規則
- [ ] 建立/加入房間可運作
- [ ] 兩台裝置對戰即時同步
- [ ] 排行榜與對戰歷史正常顯示

---

## 自訂網域（Vercel / Firebase）

兩者都支援自訂網域，在控制台設定：
- **Vercel**：Project → Settings → Domains
- **Firebase**：Hosting → Add custom domain

記得設定完後到 Firebase Console → Authentication → Authorized Domains 加上新網域。

---

## 監控與維護

### Firebase Console
- **Authentication**：看活躍使用者
- **Firestore → Usage**：看讀寫次數，避免爆免費額度
- **Realtime Database → Usage**：看連線數與流量
- **Rules → Monitor**：看規則驗證失敗的請求

### Vercel
- **Analytics**：看訪問量與效能
- **Logs**：看部署與 runtime 錯誤

---

## 升級 Firebase 方案

如果免費額度不夠用：
- 升級到 Blaze（pay-as-you-go）
- 設定預算警報（Budget alerts）避免意外
- 主要會付費的項目：Firestore reads、RTDB egress

---

## 疑難排解

### 部署後 Google 登入失敗
- 確認 Firebase Authorized Domains 已加上部署網域
- 確認環境變數正確
- 開瀏覽器 console 看 Firebase 錯誤訊息

### 路由失效（重新整理頁面 404）
- Vercel：已預先設定 `vercel.json` 的 rewrites，應正常
- Firebase Hosting：已預先設定 `firebase.json` 的 rewrites
- GitHub Pages：需改用 HashRouter 或加 404.html

### Firestore 查詢失敗
- 檢查複合索引需求（在 Firebase Console → Firestore → Indexes）
- 或參考 `subscribeLobby` 的 client 端過濾策略

### RTDB 即時同步延遲
- 檢查 `databaseURL` 是否正確
- 確認 RTDB 規則允許讀寫
