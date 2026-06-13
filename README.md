# Multiplayer Games

一個可擴充的多人遊戲平台，第一階段實作井字遊戲（Tic-Tac-Toe），未來將陸續加入更多遊戲。

## 技術棧

- **前端**：Vite + React + TypeScript + Tailwind CSS
- **狀態管理**：Zustand
- **後端服務**：Firebase (Authentication / Firestore / Realtime Database)
- **版本控制**：Git + GitHub
- **部署**：Vercel（推薦）/ Firebase Hosting / GitHub Pages

## 功能

- Google 帳號登入
- 建立/加入 6 碼房號房間
- 即時雙人對戰
- 井字遊戲（X/O、勝負判定、自動回報結果）
- 完整結果畫面（勝/敗/平手 + 自動離開倒數）
- 玩家在線狀態指示
- 對戰歷史與個人檔案
- 排行榜（依勝場排序）

## 專案結構

```
multiplayer-games/
├── docs/                      專案文件
│   ├── DEVELOPMENT_PLAN.md    開發計畫書
│   ├── FIREBASE_SETUP.md      Firebase 設定教學
│   └── DEPLOYMENT.md          部署指南
├── firebase/                  Firebase 規則
│   ├── firestore.rules
│   └── database.rules.json
├── src/
│   ├── core/                  平台核心
│   │   ├── auth/              Google 認證
│   │   ├── components/        共用元件
│   │   ├── firebase/          Firebase 初始化
│   │   ├── hooks/             React hooks
│   │   ├── services/          業務邏輯（房間、stats、history、presence）
│   │   ├── types/             型別定義
│   │   └── utils/             工具函式
│   ├── games/
│   │   └── tictactoe/         井字遊戲模組（可擴充參考）
│   ├── pages/                 頁面（Home/Lobby/GameRoom/Leaderboard/Profile）
│   ├── App.tsx                路由
│   ├── main.tsx
│   └── registry.ts            遊戲註冊表
├── firebase.json              Firebase 專案設定
├── vercel.json                Vercel 部署設定
└── README.md
```

## 開發進度

- [x] 階段 0：建立專案文件與計畫書
- [x] 階段 1：環境建置與 Firebase 設定
- [x] 階段 2：認證系統（Google 登入）
- [x] 階段 3：房間系統
- [x] 階段 4：井字遊戲核心
- [x] 階段 5：進階功能（排行榜、歷史、在線狀態）
- [x] 階段 6：部署設定（Vercel / Firebase / GitHub Pages）
- [x] 階段 7：正式部署到 Vercel ✓ **已上線 https://githubtest-blond.vercel.app**
- [ ] 階段 8：新增第二個遊戲（驗證擴充性架構）

## 線上 Demo

**https://githubtest-blond.vercel.app**

（需要 Google 帳號登入，支援 2 人即時對戰）

### 測試與建置

```bash
npm install         # 安裝依賴
npm test            # 跑單元測試
npm run typecheck   # TypeScript 型別檢查
npm run build       # 生產建置（輸出到 dist/）
npm run dev         # 開發伺服器（http://localhost:5173）
```

## 部署

詳細步驟請見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。最快的方式：

### Vercel（推薦）
1. 到 https://vercel.com 用 GitHub 登入
2. Import `multiplayer-games` repo
3. 在 Environment Variables 貼上 `.env.local` 的所有變數
4. 點 Deploy
5. 部署完成後到 Firebase Console → Authentication → Authorized Domains 加上 Vercel 網域

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy
```

## Firebase 安全規則

正式版規則已寫在 `firebase/`：
- `firestore.rules`：使用者資料、房間、對戰歷史
- `database.rules.json`：棋盤狀態、玩家在線

部署方式：
```bash
firebase deploy --only firestore:rules,database
```

## 授權

MIT


## 開始開發

請參考 [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) 取得完整規劃，
[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) 取得 Firebase 設定教學。

### 本機啟動

```bash
npm install
cp .env.example .env.local   # 填入你的 Firebase config
npm run dev
```

開啟 http://localhost:5173

## 授權

MIT
