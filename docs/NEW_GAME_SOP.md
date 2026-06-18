# 新增遊戲 SOP

> 建立新棋類遊戲（例如新棋種、新變體）的完整流程。  
> 目標：**不漏東漏西**，照著 checklist 走完就能上線。  
> 預估時間：3-5 小時（含測試與部署）。

---

## 為什麼需要這份 SOP

目前 3 個遊戲（井字、五子棋、黑白棋）的功能已擴展到 26 個改進項、12+ 個 services、8 個 hooks、15+ 個共用元件。新增一個新遊戲時，**很容易漏掉**：

- 忘了在 `GameDefinition` 綁定 `acceptUndo`（#12 悔棋）
- 忘了 `MOVES_CAP`（#22 棋譜上限）
- 忘了 `replayRenderers` 加視覺（#12 復盤）
- 忘了 RTDB `state` 規則放行新欄位（剛踩過的 #24 黑白棋 `currentTurn` 雷）
- 忘了 i18n 兩邊都加 key（剛踩過的 #25 單/雙括號雷）
- 忘了 Firestore rules 白名單加新欄位

這份 SOP 把所有「必做」和「選做」清單都列出來。

---

## Phase 0：開新遊戲（5 分鐘）

```bash
# 1. 建資料夾
mkdir -p src/games/<game-id>

# 2. 挑 gameId（kebab-case，會用在 RTDB / Firestore / URL）
#    - tictactoe、gomoku、reversi 是現有範例
#    - 新範例：connect4、checkers、minesweeper
```

---

## Phase 1：核心引擎（1-2 小時）

### 1.1 `src/games/<game-id>/types.ts`

定義：
- 狀態 interface（含 `board` / `moveCount` / `lastMove` / 任何遊戲專屬欄位）
- `createInitialState()` 函式
- `isValidState()` 型別守衛
- 任何常數（棋盤大小、EMPTY_CELL 等）
- **必填**：`board` 和 `moveCount` 兩個欄位名（RTDB rules 驗證用）

```ts
// 範例：黑白棋
export interface ReversiState {
  board: Board;
  currentTurn: 'X' | 'O';   // ← 注意：不要用 nextSymbol
  moveCount: number;
  passCount: number;
  lastMove: { row: number; col: number } | null;
  lastFlips: Array<{ row: number; col: number }>;
}
export const BOARD_SIZE = 8;
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
export const EMPTY_CELL: Cell = '';
```

### 1.2 `src/games/<game-id>/engine.ts`

實作 `GameEngine<TState>` 介面（從 `core/types/game.ts`）：
- `id` / `name` / `minPlayers` / `maxPlayers` / `description` / `initialSymbolPool`
- `validateMove(state, move)` - 移動是否合法
- `applyMove(state, move)` - 套用後回傳新 state
- `checkResult(state, players)` - 結束條件

### 1.3 測試：`<game-id>/engine.test.ts`

至少覆蓋：
- 正常一步：applyMove → checkResult 仍是 unfinished
- 贏局：玩家 X 完成連線 → checkResult 回傳 winner
- 平局：棋盤填滿但無連線 → checkResult 回傳 draw
- 非法步：validateMove 回傳 false

**確認**：`npm test -- engine.test` 全綠

---

## Phase 2：同步層（30 分鐘）

### 2.1 `src/games/<game-id>/sync.ts`

實作 3 個函式（用 `runTransaction`）：
- `submitMove(roomId, playerId, playerSymbol, displayName, payload)`
- `subscribeGameState(roomId, callback)`
- `resetGameState(roomId)`

### 2.2 submitMove 必帶欄位

```ts
const moveRecord: MoveRecord = {
  row: payload.row,
  col: payload.col,
  symbol: playerSymbol,
  uid: playerId,
  displayName,
  timestamp,
  boardAfter: newState.board as ReadonlyArray<string>,  // ← 復盤用，必填
};
// 黑白棋額外：flipped: newState.lastFlips
```

### 2.3 悔棋支援（選做，推薦）

實作 `acceptUndo(roomId, requesterUid)`：
- runTransaction 包整個流程
- 取出最後一步 → 驗證是 requester 下的
- **重新 apply moves[0..N-2]**（engine 自動同步 board 與翻面）
- 設定 turn 為 removed.symbol
- 黑白棋額外：reset passCount = 0

詳見 `src/games/reversi/sync.ts:acceptUndo` 範例

### 2.4 測試：submitMove + acceptUndo 整合測試

---

## Phase 3：AI 對手（選做，1 小時）

### 3.1 `src/games/<game-id>/ai.ts`

實作 `AIEngine<TState, TMovePayload>` 介面：
- `selectMove(state, symbol, difficulty)` → 移動或 null
- 三個難度：easy / normal / hard
- AI 玩家 UID 用 `makeAIPlayerUid('gameId', difficulty)` 產生

### 3.2 測試：`<game-id>/ai.test.ts`

---

## Phase 4：Symbol 與 Icon（30 分鐘）

### 4.1 `src/games/<game-id>/symbols.ts`（選做）

```ts
export function formatGameIdSymbol(symbol: string): string {
  if (symbol === 'X') return '玩家1';
  if (symbol === 'O') return '玩家2';
  return symbol;
}
```

### 4.2 `src/games/<game-id>/Icon.tsx`

畫一個獨特 SVG icon（24x24 viewBox）— 用於 Lobby 房間卡片、Profile 列表等

---

## Phase 5：GameDefinition 註冊（30 分鐘）

### 5.1 `src/games/<game-id>/index.ts`

```ts
import type { GameDefinition } from '../../core/types/game';
import GameIcon from './Icon';
import { gameIdEngine } from './engine';
import { gameIdAI } from './ai';          // 選做
import { formatGameIdSymbol } from './symbols';  // 選做
import { acceptUndo } from './sync';     // 選做（悔棋）

export const gameIdDefinition: GameDefinition<GameIdState> = {
  id: 'gameId',
  name: 'games.gameId.name',         // ← i18n key，不是字串
  description: '...',
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./GameId').then((m) => m.default),
  engine: gameIdEngine,
  syncStrategy: 'hybrid',
  icon: GameIdIcon,
  formatSymbol: formatGameIdSymbol,  // 選做
  estimatedDurationMin: 10,          // 選做，給 Lobby 房間卡片顯示
  aiEngine: gameIdAI,                // 選做
  acceptUndo,                         // 選做（悔棋）
  tutorialSteps: [                    // 選做
    '規則 1...',
    '規則 2...',
  ],
};
```

### 5.2 `src/registry.ts` 加進 registry

```ts
import { gameIdDefinition } from './games/gameId';
export const gameRegistry: GameDefinition[] = [
  tictactoeDefinition,
  gomokuDefinition,
  reversiDefinition,
  gameIdDefinition,  // ← 加這行
];
```

### 5.3 `src/games/<game-id>/GameId.tsx`（遊戲 UI 元件）

- 訂閱 RTDB state
- 處理玩家回合
- 用共用元件：`GameHeader` / `BoardCell` / `Toast` 等
- 處理 AI 自動下棋（如果有）
- 處理悔棋（如果有）

---

## Phase 6：棋譜復盤（#12 Phase B + #22，30 分鐘）

### 6.1 `core/types/history.ts` 加 `MOVES_CAP`

```ts
export const MOVES_CAP: Record<GameType, number> = {
  tictactoe: 9,
  gomoku: 100,
  reversi: 80,
  gameId: 50,  // ← 新增
};
```

### 6.2 `core/utils/board.ts` 加新遊戲的初始棋盤

```ts
case 'gameId':
  return createGameIdState().board as ReadonlyArray<string>;
```

### 6.3 `core/utils/replayRenderers.tsx` 加新遊戲的視覺

```ts
case 'gameId':
  return {
    boardSize: BOARD_SIZE,
    boardClassName: '...',
    renderCell: (cell, isLastMoveHere, isFlipped) => { ... },
  };
```

---

## Phase 7：i18n（中英對齊，30 分鐘）

### 7.1 `src/core/i18n/locales/zh-TW.json` + `en-US.json` 必加 keys

```json
"games": {
  "gameId": {
    "name": "新棋名稱",
    "loading": "載入中...",
    "stateCorrupted": "棋盤狀態損壞",
    "playAgainHint": "房主可按「再來一局」",
    // 選做：
    "tutorialSteps": ["..."],
    "passCount": "已連續 Pass {{count}} 次",  // 黑白棋用
    "noValidMove": "沒有可下的位置",
    "myTurn_tictactoe": "...",  // 井字 / 五子棋
    "myTurn_gomoku": "...",
    "myTurn_reversi": "...",
    "myTurn_gameId": "...",  // 新遊戲（如果用 template）
    "spectating_tictactoe": "...",
    "spectating_gomoku": "...",
    "spectating_reversi": "...",
    "spectating_gameId": "...",
    "opponentTurn_tictactoe": "...",
    ...
  }
}
```

### 7.2 ⚠️ 重要：interpolation 一律用 `{{name}}` 雙括號

```json
"passCount": "已連續 Pass {{count}} 次"   // ✓ 對
"passCount": "已連續 Pass {count} 次"     // ✗ 錯（i18next 不會替換）
```

測試會抓：`src/core/i18n/locales/i18n.test.ts` 跑「不允許單括號」檢查。

### 7.3 測試

`npm test` 確認：
- i18n parity（中英 key 一致）
- 沒單括號 interpolation
- zh-TW ≥ 80 keys
- 3 大遊戲都有 name/loading/stateCorrupted（如果新遊戲有 `name` 也會自動包含）

---

## Phase 8：Firestore Rules（5 分鐘）

### 8.1 檢查 `firebase/firestore.rules`

**Room update 白名單**（line 81-83）：檢查新欄位是否在 `hasOnly` 內。如果有寫新欄位（例如 `gameType` 限額），要加進去。

**`gameHistory` collection**（line 126-132）：如果新遊戲的對局要存棋譜，規則是「公開讀 + 玩家建」，**已涵蓋所有遊戲**，不用改。

### 8.2 部署

```bash
firebase deploy --only firestore:rules
```

---

## Phase 9：RTDB Rules（5-10 分鐘）

### 9.1 檢查 `firebase/database.rules.json` 的 `state.validate`

```json
"state": {
  ".read": "auth != null",
  ".write": "auth != null",
  ".validate": "newData.hasChildren(['board', 'moveCount'])"
}
```

**⚠️ 雷區**：
- `board` 和 `moveCount` 是**所有遊戲共用**的，**一定要有**
- `nextSymbol`（井字/五子棋）和 `currentTurn`（黑白棋）**千萬不要**加進 validate
- 想驗證更多欄位 → 寫在 `core/services/{game}/sync.ts` 的 `runTransaction` 裡

### 9.2 部署

```bash
firebase deploy --only database
```

---

## Phase 10：Firestore 複合索引（如果新查詢）

如果 `Explore` 頁的 `searchHistory` 用了新欄位當 filter，要加索引到 `firestore.indexes.json`：

```json
{
  "collectionGroup": "gameHistory",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "gameType", "order": "ASCENDING" },
    { "fieldPath": "<新欄位>", "order": "ASCENDING" },
    { "fieldPath": "endedAt", "order": "DESCENDING" }
  ]
}
```

部署：

```bash
firebase deploy --only firestore  # 一併部署 rules + indexes
```

**⚠️ 不要加單欄位索引**（會被 API 拒絕 400，Firestore 自動建）。

---

## Phase 11：Lobby 與選單（10 分鐘）

### 11.1 Lobby 房間卡片

`Lobby.tsx` 用 `gameRegistry` 自動處理，**不用改**。
- 房主可選遊戲類型：原本就有 `selectedGame` state，從 registry 列出
- 確認：建新房時 `selectedGame` 預設值可加 `'gameId'`

### 11.2 設定/AI 房

如果有 AI：在 `Lobby.tsx` 的 AI 難度選單可加 gameId 專屬預設。

---

## Phase 12：Profile / 戰績（自動）

`useUserStats` 用 `byGame.{gameType}` 子欄位。新遊戲的戰績**自動**存在 `users/{uid}.byGame.gameId` 路徑。

**檢查 `statsService.recordGameResult`**：是否正確讀取 `players[].symbol`（應該通用，不用改）。

### 12.1 ⚠️ 常見漏掉的位置（**新增遊戲最容易忘的地方**）

下面這些地方**每個都會硬編 gameId 清單**，新增遊戲時**必須一起更新**。  
建議：把硬編清單改成 `gameRegistry.map(...)` 自動產生（下面標 ✅ 已改 / ⚠️ 待改）。

| 位置 | 檔案 | 寫法 | 狀態 |
|---|---|---|---|
| Profile「我的棋譜」遊戲名 + Icon | `pages/Profile.tsx` | 硬編 `GAME_LABELS` / `GAME_ICONS` | ⚠️ **必改**（用 Record 必須 exhaustive）|
| Leaderboard tabs | `pages/Leaderboard.tsx` | 原本硬編 → 改用 `gameRegistry.map` | ✅ 已自動 |
| Explore 篩選器 | `pages/Explore.tsx` | 原本硬編 → 改用 `FILTER_GAME_OPTIONS` | ✅ 已自動 |
| BoardThumbnail | `core/components/BoardThumbnail.tsx` | if/switch 渲染 | ⚠️ **必加**新 gameType case |
| GameRoom 遊戲邏輯 | `pages/GameRoom.tsx` | `if (gameType === 'xxx')` 三處分支 | ⚠️ **必加**新 resetGameState / submitMove 引入 |
| i18n keys | `core/i18n/locales/*.json` | 必須 explicit 加（雙括號、parity 測試會抓）| ⚠️ **必加** |
| 戰績 byGame shape | `core/services/statsService.ts` | `byGame: { xxx: GameStats, ... }` | ⚠️ **必加** |
| GameType union | `core/types/room.ts` | `'tictactoe' \| 'gomoku' \| ...` | ⚠️ **必加** |
| MOVES_CAP | `core/types/history.ts` | `MOVES_CAP: Record<GameType, number>` | ⚠️ **必加**（沒有會無限增長）|
| getInitialBoard | `core/utils/board.ts` | switch case | ⚠️ **必加** |
| replayRenderers | `core/utils/replayRenderers.tsx` | switch case | ⚠️ **必加** |

**檢查指令**（必跑）：

```bash
# 找所有硬編 gameId 的地方
grep -rn "'tictactoe'\|'gomoku'\|'reversi'" src/

# 跑 typecheck 看有沒有漏掉 GameType union
npm run typecheck

# 跑 i18n parity 測試
npm test -- i18n
```

**已發生**：2026-06-18 Connect 4 上線時漏掉 `Explore.tsx` 的篩選清單和 `BoardThumbnail.tsx` 的渲染，導致公開棋譜列表看不到四子棋。

---

## Phase 13：測試（30-60 分鐘）

### 必測：
- [ ] `engine.test.ts`：applyMove、validateMove、checkResult
- [ ] `ai.test.ts`（如果有 AI）：3 個難度
- [ ] `sync.test.ts`（手動測試或整合測試）

### 整合測試清單（手動跑一遍）：
- [ ] 開新遊戲房 → 兩人加入 → 開始 → 下棋 → 結束 → 棋譜雙方都有
- [ ] 加到最愛 → Profile「我的最愛」看到
- [ ] 悔棋請求 → 對方收到 → 同意 → 棋盤退回上一步
- [ ] 對戰後進探索頁 → 看到這場
- [ ] 重新整理後棋譜/聊天/反應都還在

---

## Phase 14：部署（5 分鐘）

```bash
# 1. 跑三項檢查
npm run typecheck
npm test
npm run build

# 2. 推送（Vercel 自動部署前端）
git add -A
git commit -m "feat(game): 新增 <gameId>"
git push origin main

# 3. 部署 Firebase（如果有改 rules / indexes）
firebase deploy --only firestore:rules,database,firestore
# 或分開跑，看改了什麼
```

---

## Phase 15：文檔更新（10 分鐘）

- [ ] `docs/IMPROVEMENTS.md`：把這次新遊戲的 26 項狀態更新（如果有新功能）
- [ ] `docs/WORK_JOURNAL.md`：加新條目
- [ ] `docs/SOP.md`：如果發現新雷區，加進去

---

## 完成 Checklist（最後一關）

- [ ] Phase 1: 核心引擎 + 測試全綠
- [ ] Phase 2: 同步層（含悔棋如果要做）
- [ ] Phase 3: AI（如果做）
- [ ] Phase 4: Symbol + Icon
- [ ] Phase 5: GameDefinition + registry
- [ ] Phase 6: 棋譜復盤（caps + 初始棋盤 + 視覺）
- [ ] Phase 7: i18n 雙括號 interpolation
- [ ] Phase 8: Firestore rules（白名單檢查）
- [ ] Phase 9: RTDB rules（**只驗 board + moveCount**）
- [ ] Phase 10: Firestore 索引（如果新查詢）
- [ ] Phase 11-12: Lobby / Profile（自動處理）
- [ ] Phase 13: 測試全綠 + 手動跑整合清單
- [ ] Phase 14: 部署完成
- [ ] Phase 15: 文檔更新

---

## 常見踩坑（從現有 3 個遊戲整理出來）

| 坑 | 怎麼避 |
|---|---|
| i18n 單括號 `{x}` 不會被替換 | 一律用 `{{x}}`，測試會抓 |
| RTDB `state` validate 加了 `nextSymbol` | 黑白棋用 `currentTurn`，**不要加** |
| Firestore rules 白名單沒加新欄位 | 改 `rooms` 結構時必查 line 81-83 |
| `MOVES_CAP` 沒加新遊戲 | 不加會沒上限，無限增長 |
| 忘了 GameDefinition 綁 `acceptUndo` | 悔棋按鈕不會出現 |
| `replayRenderers` 沒加新視覺 | 復盤會 fallback 用通用樣式（醜） |
| Icon 用 emoji 而非 SVG | 大廳房間卡片會糊 |
| `getInitialBoard` 沒加 case | 復盤初始棋盤錯 |
| `useSettings` theme 沒加新主題 | Settings 頁面該主題不出現（如果不需新主題就跳過）|

---

## 之後的擴展點

新增遊戲時可以考慮（**選做，不影響基本功能**）：
- 變體（#14 房間設定擴充）：`variants: GameVariant[]` 讓 Lobby 顯示變體選擇
- 成就（#15）：加新成就「連勝 10 場 gameId」
- 排行榜過濾：Leaderboard 頁面的 tab 自動包含（從 `byGame.*` 讀取）
- 房間設定（#14）：每局自訂參數（例如棋盤大小、初始佈局）
- 自訂 AI 難度等級（目前固定 3 個）

---

**完成這份 SOP 的時間：每次新增遊戲約 3-5 小時，預期可避免 60% 的「忘了這個」bug。**
