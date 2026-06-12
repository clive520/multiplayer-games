# 多人遊戲網站 — 開發計畫書

> 版本：v0.1  
> 最後更新：2026-06-12  
> 狀態：規劃階段

---

## 目錄

1. [專案概述](#一專案概述)
2. [設計原則](#二設計原則)
3. [技術棧](#三技術棧)
4. [Firebase 雙軌設計](#四firebase-雙軌設計)
5. [資料模型](#五資料模型)
6. [專案架構](#六專案架構)
7. [Git 與版控策略](#七git-與版控策略)
8. [井字遊戲 MVP 規格](#八井字遊戲-mvp-規格)
9. [開發階段與時程](#九開發階段與時程)
10. [初始化檢查清單](#十初始化檢查清單)
11. [擴充指南：新增一個遊戲](#十一擴充指南新增一個遊戲)
12. [安全與最佳實踐](#十二安全與最佳實踐)
13. [參考資源](#十三參考資源)

---

## 一、專案概述

### 1.1 目標
打造一個**可擴充的多人遊戲平台**，以網頁形式提供即時對戰體驗。

### 1.2 MVP 範圍
- 第一階段只實作 **井字遊戲（Tic-Tac-Toe）**
- 完整支援：Google 登入、建立/加入房間、兩人即時對戰、勝負判定、重新開始

### 1.3 長期願景
平台化，未來可陸續新增：
- 棋類（五子棋、黑白棋、象棋）
- 牌類（UNO、撿紅點）
- 派對遊戲（你畫我猜、狼人殺）

### 1.4 成功標準
- 兩個瀏覽器能順暢對戰，延遲 < 500ms
- 新增一款遊戲的工作量 < 2 天
- Firebase 免費額度足夠支撐日常使用

---

## 二、設計原則

| 原則 | 說明 |
|------|------|
| **模組化優先** | 每個遊戲是獨立模組，與平台核心解耦 |
| **擴充點單一** | 透過「遊戲註冊表」新增遊戲，零改動核心 |
| **資料與邏輯分離** | 遊戲邏輯（engine）與 Firebase 同步（sync）分離 |
| **型別安全** | 全面使用 TypeScript，避免 runtime 錯誤 |
| **安全規則嚴謹** | 玩家只能操作自己有權限的房間狀態 |
| **金鑰不入庫** | 所有 Firebase config 透過環境變數注入 |

---

## 三、技術棧

### 3.1 前端

| 技術 | 版本 | 用途 |
|------|------|------|
| Vite | 5+ | 建置工具，啟動快、HMR 順暢 |
| React | 18+ | UI 框架 |
| TypeScript | 5+ | 型別安全 |
| React Router | 6+ | 路由管理 |
| Tailwind CSS | 3+ | 樣式系統 |
| Zustand | 4+ | 全域狀態管理（輕量） |

### 3.2 後端服務

| 服務 | 用途 |
|------|------|
| Firebase Authentication | Google 帳號登入 |
| Cloud Firestore | 結構化資料、查詢、歷史紀錄 |
| Realtime Database | 即時同步、低延遲狀態 |
| Firebase Hosting *(選用)* | 部署託管 |

### 3.3 工具鏈

| 工具 | 用途 |
|------|------|
| Git + GitHub | 版本控制 |
| ESLint + Prettier | 程式碼風格 |
| Vitest | 單元測試（遊戲邏輯） |
| Conventional Commits | Commit 訊息規範 |

### 3.4 為什麼選 Vite + React 而非純 HTML/JS？

- 模組化、共用元件、型別系統在原生 JS 會快速累積技術債
- 未來擴充多遊戲時，沒有框架會很痛苦
- 學習資源豐富，社群支援完整

---

## 四、Firebase 雙軌設計

依「兩者都用，依遊戲性質決定」原則分工：

### 4.1 服務分工

| Firebase 服務 | 用途 | 特性 |
|--------------|------|------|
| **Firestore** | 結構化資料、需查詢 | 文件型、索引、查詢彈性 |
| **Realtime Database** | 即時同步、低延遲 | 毫秒級推送、樹狀結構 |

### 4.2 資料分流原則

| 資料類型 | 放哪裡 | 範例 |
|---------|-------|------|
| 使用者 profile | Firestore | 顯示名稱、大頭貼、統計 |
| 房間 metadata | Firestore | 房號、玩家列表、狀態 |
| 對戰歷史 | Firestore | 每步紀錄、結果 |
| 排行榜 | Firestore | 勝率、積分 |
| 即時棋盤狀態 | RTDB | 9 格、當前輪到誰 |
| 玩家在線狀態 | RTDB | presence |
| 聊天訊息 | RTDB | 即時廣播 |
| 繪圖軌跡（你畫我猜） | RTDB | 筆畫座標 |
| 隱私資訊（如 UNO 手牌） | Firestore + 安全規則 | 僅自己可讀 |

### 4.3 為什麼需要兩者並用？

- Firestore 對「查詢」友善（排行榜、房間列表）
- RTDB 對「即時同步」延遲最低（每步棋 < 100ms）
- 兩者特性互補，純用 Firestore 做即時遊戲會有效能瓶頸

---

## 五、資料模型

### 5.1 Firestore 結構

```
users/{uid}
├── displayName: string
├── photoURL: string
├── email: string
├── createdAt: Timestamp
└── stats: {
    wins: number,
    losses: number,
    draws: number
  }

rooms/{roomId}
├── gameType: "tictactoe" | "gomoku" | "uno"   ← 預留擴充
├── hostId: string
├── status: "waiting" | "playing" | "finished"
├── players: [
    { uid, symbol: "X"|"O", ready: boolean }
  ]
├── createdAt: Timestamp
├── winnerId: string | null
└── endedAt: Timestamp | null

rooms/{roomId}/history/{moveId}
├── playerId: string
├── move: { row, col }  ← 依遊戲引擎定義
└── timestamp: Timestamp

leaderboard/{uid}
├── wins: number
├── losses: number
├── draws: number
└── rating: number       ← 之後可做 ELO
```

### 5.2 Realtime Database 結構

```
rooms-live/{roomId}/
├── state/
│   ├── board: ["X", "", "O", "", "", "", "", "", ""]   ← 井字範例
│   ├── currentTurn: uid
│   ├── moveCount: number
│   └── startedAt: number   ← 毫秒
├── presence/
│   └── {uid}: { online: true, lastSeen: number }
└── chat/
    └── {msgId}: { uid, text, ts }
```

### 5.3 設計重點

- **房號產生**：使用 6 碼英數字（例如 `A3K9X2`），避免連字號易混淆字元
- **gameType 欄位**：是擴充性的關鍵，路由器依此決定載入哪個遊戲元件
- **history 子集合**：完整保留每步紀錄，方便復盤與動畫回放

---

## 六、專案架構

### 6.1 目錄結構

```
multiplayer-games/
├── docs/                          ← 專案文件
│   └── DEVELOPMENT_PLAN.md        ← 本文件
│
├── public/                        ← 靜態資源
│
├── src/
│   ├── core/                      ← 平台核心（不隨遊戲變動）
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── useAuth.ts
│   │   │   └── googleSignIn.ts
│   │   ├── firebase/
│   │   │   ├── config.ts         ← 從環境變數讀取
│   │   │   ├── app.ts            ← Firebase 初始化
│   │   │   ├── firestore.ts      ← Firestore 實例
│   │   │   └── rtdb.ts           ← RTDB 實例
│   │   ├── hooks/
│   │   │   ├── useRoom.ts        ← 房間生命週期
│   │   │   ├── useGameSync.ts    ← 通用同步 hook
│   │   │   └── usePresence.ts
│   │   ├── components/            ← 共用 UI
│   │   │   ├── RoomLayout.tsx
│   │   │   ├── PlayerPanel.tsx
│   │   │   ├── ChatBox.tsx
│   │   │   └── GameContainer.tsx ← 動態載入遊戲
│   │   └── types/
│   │       ├── game.ts            ← GameDefinition 介面
│   │       ├── room.ts
│   │       └── user.ts
│   │
│   ├── games/                     ← 遊戲模組（每個遊戲一個資料夾）
│   │   ├── tictactoe/
│   │   │   ├── TicTacToe.tsx      ← UI 元件
│   │   │   ├── engine.ts          ← 遊戲邏輯（純函式）
│   │   │   ├── engine.test.ts     ← 單元測試
│   │   │   ├── sync.ts            ← 同步策略
│   │   │   ├── types.ts
│   │   │   └── index.ts           ← 對外 export GameDefinition
│   │   ├── gomoku/                ← 之後加入
│   │   └── uno/                   ← 之後加入
│   │
│   ├── pages/                     ← 頁面層
│   │   ├── Home.tsx               ← 遊戲大廳
│   │   ├── Lobby.tsx              ← 房間列表
│   │   ├── GameRoom.tsx           ← 通用房間
│   │   └── Profile.tsx
│   │
│   ├── stores/                    ← Zustand stores
│   │   ├── authStore.ts
│   │   └── roomStore.ts
│   │
│   ├── registry.ts                ← 遊戲註冊表（擴充點）
│   ├── router.tsx
│   ├── App.tsx
│   └── main.tsx
│
├── .env.example                   ← 環境變數範本
├── .env.local                     ← 實際設定（不入版控）
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 6.2 核心介面：GameDefinition

這是擴充性的關鍵，所有遊戲都必須實作這個介面：

```typescript
// src/core/types/game.ts
import type { ComponentType } from 'react';

export interface Player {
  uid: string;
  symbol: string;          // 例如 "X" / "O"，由遊戲定義
  ready: boolean;
}

export interface GameMove {
  playerId: string;
  payload: unknown;        // 遊戲自定義
  timestamp: number;
}

export interface GameEngine {
  readonly id: string;
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly description: string;

  // 純函式：驗證移動是否合法
  validateMove(state: unknown, move: GameMove): boolean;

  // 純函式：套用移動並回傳新狀態
  applyMove(state: unknown, move: GameMove): unknown;

  // 純函式：判定遊戲結果
  checkResult(state: unknown): {
    finished: boolean;
    winnerId?: string;
    isDraw?: boolean;
  };

  // 遊戲初始狀態
  getInitialState(): unknown;
}

export interface GameDefinition {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  icon?: string;
  component: ComponentType<GameComponentProps>;
  engine: GameEngine;
  syncStrategy: 'firestore' | 'rtdb' | 'hybrid';
}

export interface GameComponentProps {
  roomId: string;
  currentUserId: string;
  players: Player[];
}
```

### 6.3 遊戲註冊表

```typescript
// src/registry.ts
import type { GameDefinition } from './core/types/game';
import { tictactoeDefinition } from './games/tictactoe';

export const gameRegistry: GameDefinition[] = [
  tictactoeDefinition,
  // 未來新增：gomokuDefinition, unoDefinition
];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
```

### 6.4 通用房間（動態載入）

```typescript
// src/pages/GameRoom.tsx（概念）
function GameRoom() {
  const { roomId } = useParams();
  const room = useRoom(roomId);          // 從 Firestore 讀 metadata
  const gameDef = getGameDefinition(room.gameType);

  if (!gameDef) return <NotFound />;

  const GameComponent = gameDef.component;
  return (
    <RoomLayout room={room}>
      <GameComponent
        roomId={roomId}
        currentUserId={currentUser.uid}
        players={room.players}
      />
    </RoomLayout>
  );
}
```

---

## 七、Git 與版控策略

### 7.1 分支模型

採用簡化版 Git Flow：

```
main              ← 穩定可部署版本，保護分支
└── develop       ← 整合開發主線
    ├── feature/auth          ← Google 登入
    ├── feature/firebase-init ← Firebase 設定
    ├── feature/room-system   ← 房間系統
    ├── feature/tictactoe     ← 井字遊戲
    └── feature/deploy        ← 部署設定
```

### 7.2 Commit 規範

採用 [Conventional Commits](https://www.conventionalcommits.org/)：

| 前綴 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修 bug |
| `refactor:` | 重構（無功能變動） |
| `docs:` | 純文件 |
| `style:` | 格式（不影響邏輯） |
| `test:` | 測試 |
| `chore:` | 雜項（建構、依賴） |

範例：
```
feat(tictactoe): 新增棋盤 UI 元件
fix(room): 修正房間狀態同步競爭條件
docs: 更新開發計畫書
```

### 7.3 .gitignore 必備項目

```gitignore
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vscode/
.idea/
coverage/
```

### 7.4 Pull Request 流程

1. 從 `develop` 切出 `feature/xxx`
2. 開發完成後發 PR → `develop`
3. 自我審查 + CI 通過後合併
4. 定期從 `develop` 發 PR → `main` 部署

---

## 八、井字遊戲 MVP 規格

### 8.1 功能清單

#### 必要功能（P0）
- [ ] Google 帳號登入 / 登出
- [ ] 建立新房間（自動產生 6 碼房號）
- [ ] 透過房號加入房間
- [ ] 房間等待大廳（顯示玩家、準備狀態）
- [ ] 開始遊戲（兩人都準備後）
- [ ] 9 格棋盤 UI
- [ ] 輪流下棋、即時同步
- [ ] 勝負判定（橫、豎、對角）
- [ ] 平手判定
- [ ] 顯示當前輪到誰
- [ ] 重新開始

#### 進階功能（P1）
- [ ] 對戰歷史紀錄查詢
- [ ] 簡單排行榜（勝場數）
- [ ] 房內文字聊天
- [ ] 玩家在線狀態指示
- [ ] 遊戲結束動畫

#### 不在 MVP 範圍（P2+）
- 觀戰模式
- 好友系統
- ELO 積分
- 音效/配樂
- 多語系

### 8.2 井字引擎設計

```typescript
// src/games/tictactoe/engine.ts
export type Cell = 'X' | 'O' | '';
export type Board = Cell[];  // 長度 9

export const TICTACTOE_ENGINE: GameEngine = {
  id: 'tictactoe',
  name: '井字遊戲',
  minPlayers: 2,
  maxPlayers: 2,
  description: '經典三人連線遊戲',

  getInitialState: () => Array(9).fill(''),

  validateMove: (state, move) => {
    const board = state as Board;
    const { row, col } = move.payload as { row: number; col: number };
    const idx = row * 3 + col;
    return idx >= 0 && idx < 9 && board[idx] === '';
  },

  applyMove: (state, move) => {
    const board = [...(state as Board)];
    const { row, col } = move.payload as { row: number; col: number };
    const idx = row * 3 + col;
    const symbol = move.playerId === /* host */ ? 'X' : 'O';
    board[idx] = symbol;
    return board;
  },

  checkResult: (state) => {
    const board = state as Board;
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],  // 橫
      [0,3,6],[1,4,7],[2,5,8],  // 豎
      [0,4,8],[2,4,6],          // 對角
    ];
    for (const [a,b,c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { finished: true, winnerId: /* 對應玩家 */ };
      }
    }
    if (board.every((c) => c !== '')) {
      return { finished: true, isDraw: true };
    }
    return { finished: false };
  },
};
```

### 8.3 同步策略（井字）

- **棋盤狀態** → Realtime Database（`rooms-live/{roomId}/state/board`）
- **房間 metadata**（玩家列表、狀態）→ Firestore
- **對戰歷史** → Firestore subcollection

---

## 九、開發階段與時程

### Phase 0：環境建置（半天）
- [ ] 本機：建立專案資料夾、`git init`
- [ ] 連接到 GitHub repo
- [ ] 建立 `.gitignore`、`README.md`
- [ ] 建立 `docs/DEVELOPMENT_PLAN.md`（本文件）
- [ ] Vite + React + TS 初始化
- [ ] 安裝核心依賴（Tailwind、React Router、Zustand、Firebase）

### Phase 1：Firebase 與認證（半天）
- [ ] 到 Firebase Console 建立專案
- [ ] 啟用 Authentication (Google Provider)
- [ ] 建立 Firestore 與 Realtime Database
- [ ] 設定 `.env.local`
- [ ] 實作 `AuthProvider` + `useAuth`
- [ ] 登入/登出按鈕

### Phase 2：房間系統（1-2 天）
- [ ] 房號產生器
- [ ] 建立房間（Firestore）
- [ ] 加入房間（透過房號查詢）
- [ ] 房間列表頁（Lobby）
- [ ] 房間等待大廳 UI
- [ ] 玩家準備狀態

### Phase 3：井字遊戲（2-3 天）
- [ ] `engine.ts` + 單元測試
- [ ] `TicTacToe.tsx` UI 元件
- [ ] 棋盤狀態即時同步（RTDB）
- [ ] 勝負/平手判定觸發
- [ ] 重新開始功能
- [ ] 對戰歷史寫入 Firestore

### Phase 4：部署與測試（半天）
- [ ] GitHub Pages 或 Vercel 部署設定
- [ ] Firebase 安全規則
- [ ] 多人跨裝置測試
- [ ] 錯誤情境處理（斷線、作弊防護）

### 總時程估計
**5-7 個工作天**（不含學習時間）

---

## 十、初始化檢查清單

### 10.1 在 Firebase Console
- [ ] 建立新專案（命名：`multiplayer-games`）
- [ ] 新增 Web app，複製 config
- [ ] Authentication → Sign-in method → 啟用 Google
- [ ] Firestore Database → 建立（production mode）
- [ ] Realtime Database → 建立
- [ ] 設定授權網域（localhost + 部署網域）

### 10.2 在 GitHub
- [ ] 建立新 repo（命名建議：`multiplayer-games`）
- [ ] 設定 `main` 為保護分支
- [ ] 設定 branch protection rules（需 PR 合併）

### 10.3 在本機
- [ ] `git init` → `git remote add origin <url>`
- [ ] 建立 `docs/DEVELOPMENT_PLAN.md`（本文件）
- [ ] 建立 `.env.example`
- [ ] 建立 `.gitignore`
- [ ] 第一次 commit：`chore: 初始化專案與計畫書`

---

## 十一、擴充指南：新增一個遊戲

以新增「五子棋」為例，完整流程：

### 步驟
1. **建立資料夾**：`src/games/gomoku/`
2. **實作 engine**：
   - `engine.ts`（棋盤邏輯、勝負判定）
   - `engine.test.ts`（單元測試）
3. **實作 UI**：`Gomoku.tsx`
4. **實作同步**：`sync.ts`（決定用 RTDB/Firestore/hybrid）
5. **定義型別**：`types.ts`
6. **匯出定義**：`index.ts`
7. **註冊到 registry**：

```typescript
// src/registry.ts
import { gomokuDefinition } from './games/gomoku';
export const gameRegistry = [
  tictactoeDefinition,
  gomokuDefinition,   // ← 加這行
];
```

8. **新增圖示**（選用）
9. **測試 + 發 PR**

**預估工作量：1-2 天**

### 遊戲類型與同步策略對照表（給未來參考）

| 遊戲類型 | 建議策略 | 原因 |
|---------|---------|------|
| 棋類（井字、五子棋、象棋） | RTDB 為主 | 棋盤小、同步頻率中等 |
| 牌類（UNO） | Firestore + 安全規則 | 手牌需隱私、需驗證出牌合法性 |
| 繪圖（你畫我猜） | RTDB 為主 | 筆畫座標需毫秒級同步 |
| 文字遊戲（狼人殺） | Firestore 為主 | 投票、角色資訊需查詢與保密 |
| 即時反應類 | RTDB 為主 | 延遲敏感 |

---

## 十二、安全與最佳實踐

### 12.1 金鑰管理
- Firebase Web API key 雖然有公開限制，但**仍不應入版控**
- 統一透過 `.env.local` 注入，使用 `.env.example` 提示需要哪些變數
- `.env.local` 必須在 `.gitignore` 中

### 12.2 Firebase 安全規則（核心）

**Firestore 範例**：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null
        && request.auth.uid in resource.data.players.map((p) => p.uid);
    }
  }
}
```

**Realtime Database 範例**：
```json
{
  "rules": {
    "rooms-live": {
      "$roomId": {
        "state": {
          ".read": "auth != null",
          ".write": "auth != null && data.child('players').child(auth.uid).exists()"
        }
      }
    }
  }
}
```

### 12.3 防止常見問題
- **斷線處理**：用 RTDB 的 `onDisconnect` 自動更新 presence
- **競爭條件**：用 transaction 或樂觀鎖避免
- **重整掉資料**：本地暫存遊戲狀態，reconnect 時恢復

### 12.4 程式碼品質
- `engine.ts` 必須是**純函式**，方便單元測試
- 同步邏輯（`sync.ts`）與遊戲邏輯分離
- 共用程式碼放 `core/`，禁止遊戲模組互相引用

---

## 十三、參考資源

### 官方文件
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore 安全性規則](https://firebase.google.com/docs/firestore/security/get-started)
- [React Router v6](https://reactrouter.com/)
- [Vite 官方文件](https://vitejs.dev/)

### 學習資源
- [Conventional Commits](https://www.conventionalcommits.org/zh-hant/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)

### 工具
- [Firebase Console](https://console.firebase.google.com/)
- [GitHub](https://github.com/)

---

## 變更紀錄

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| v0.1 | 2026-06-12 | 初版建立 |

---

> **使用方式**：本文件為開發時的「單一事實來源」(Single Source of Truth)。  
> 任何架構決策變更前，請先更新本文件再修改程式碼。
