# Multiplayer Games

一個可擴充的多人遊戲平台，第一階段實作井字遊戲（Tic-Tac-Toe），未來將陸續加入更多遊戲。

## 技術棧

- **前端**：Vite + React + TypeScript + Tailwind CSS
- **狀態管理**：Zustand
- **後端服務**：Firebase (Authentication / Firestore / Realtime Database)
- **版本控制**：Git + GitHub
- **部署**：GitHub Pages / Vercel

## 專案結構

```
multiplayer-games/
├── docs/                    專案文件
│   └── DEVELOPMENT_PLAN.md  開發計畫書（單一事實來源）
├── src/
│   ├── core/                平台核心（認證、Firebase、共用元件、hooks）
│   ├── games/               遊戲模組（每個遊戲一個資料夾）
│   │   └── tictactoe/       井字遊戲
│   ├── pages/               頁面層
│   ├── stores/              Zustand stores
│   └── registry.ts          遊戲註冊表（擴充點）
├── .env.example             環境變數範本
└── README.md
```

## 開發進度

- [x] 階段 0：建立專案文件與計畫書
- [x] 階段 1：環境建置與 Firebase 設定
- [x] 階段 2：認證系統（Google 登入）
- [x] 階段 3：房間系統
- [x] 階段 4：井字遊戲核心
- [ ] 階段 5：部署與測試

### 測試

```bash
npm test         # 跑單元測試
npm run typecheck  # TypeScript 型別檢查
npm run build    # 生產建置
```

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
