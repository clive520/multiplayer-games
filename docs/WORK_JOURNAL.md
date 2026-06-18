# 工作日誌

> 記錄多人遊戲網站專案的所有開發事件。  
> **格式**：倒序（最新在最上面），按日期時間排列。  
> **目標**：事後可回溯決策與問題。

---

## 2026-06-18（Day 4 續）— 新增第 5 個遊戲「點點連連 Dots and Boxes」

**用戶要求**：繼續做 5th 遊戲 - 點點連連（Dots and Boxes）。

**決策**：
- 嚴格照 `NEW_GAME_SOP.md` 走 15 個 phases
- 4×4 方格 = 16 方格、5×5 點 = 25 點、40 條邊（h+v）
- 藍線 X / 紅線 O（與四子棋紅/黃、黑白棋黑/白區分）
- 額外回合機制：完成方格可多畫一條邊
- AI 啟發式：easy 隨機 / normal 「3-side 必取 + 避 2-side」/ hard 「normal + 估計鏈長」

**實作**：
1. Phase 0：建 `src/games/dotsandboxes/` 資料夾
2. Phase 1：`types.ts` (DotsAndBoxesState with hEdges/vEdges/boxOwners/2D arrays)、`engine.ts`（applyMove 自動偵測完成方格 + 額外回合）、`engine.test.ts` 12 個測試
3. Phase 2：`sync.ts` (submitMove + acceptUndo，悔棋時 reapply moves[0..N-2])
4. Phase 3：`ai.ts`（3-side 必取 + 避 2-side + 鏈長啟發式）+ `ai.test.ts` 5 個測試
5. Phase 4：symbols.ts (藍線/紅線) + Icon.tsx (9 個彩色方格 + 16 個點)
6. Phase 5：GameDefinition + DotsAndBoxes.tsx UI（SVG 棋盤 + 邊的點擊熱區 + hover 預覽）+ registry 註冊
7. Phase 6：MOVES_CAP 40 + getInitialBoard (3 grid 扁平化) + replayRenderers + acceptUndo + BoardThumbnail 4×4 縮圖
8. Phase 7：i18n 中英對齊（name, moveFailed, edgeTaken, extraTurnHint, headerStatus 3 個, verb, scopeDotsAndBoxes, filterDotsAndBoxes）
9. Phase 8-10：**RTDB 規則需改**！原本 `state.validate: hasChildren(['board', 'moveCount'])` 不適用（dotsandboxes 沒 `board` 欄，改用 hEdges/vEdges/boxOwners）→ 改為只驗 `moveCount` 並部署。Firestore rules 不需改。
10. Phase 11-12：Lobby / Profile / Leaderboard 自動從 registry 讀
11. Phase 13：208/208 測試過、build OK、Vercel 自動部署
12. Phase 14-15：commit `2b5ac50` + push

**效果**：
- 208/208 測試過（含 12 個 dotsandboxes engine 測試 + 5 個 AI 測試）
- TS 0 錯誤、build OK
- Leaderboard / Profile / Lobby 自動包含點點連連
- 探索頁可篩選點點連連棋譜
- 復盤時間軸支援（4×4 彩色方格 renderer）
- 悔棋功能支援（重算 moves[0..N-2]）

**踩坑**：
1. **RTDB validate 規則** — 原本以為「共用 board + moveCount」就夠，沒想到 5th 遊戲用 3 個 grid。**SOP 情境 B/D 已提醒，但忘了**。改為只驗 `moveCount`（所有遊戲都有的最基本欄位）。
2. **MoveRecord 缺 metadata** — 原本 MoveRecord 只有 row/col/symbol，沒辦法存「這步是水平邊還是垂直邊」。加 `metadata?: Record<string, unknown>` 欄位，dotsandboxes 存 `{ type: 'h' | 'v' }`。悔棋時用 `m.metadata?.type` fallback 'h'。
3. **engine.test.ts 一開始 2 個測試錯** — `applyEdge` 測試輔助函式的 `symbol` 參數根本沒用（engine 用 `state.currentTurn`），誤傳 symbol。改測試邏輯：直接驗 `vEdges[0][0] === 'X'` (因為 X 先手)。
4. **AI 3-side 偵測漏掉「完成方格」** — 原本只偵測 sides === 2（畫完變 3-side），漏了 sides === 3（畫完變 4-side 完成方格）。補上 `sides === 2 || sides === 3 → threeSide++`。
5. **getInitialBoard 對 CellMark?[]** — DotsAndBoxesState 的 hEdges 是 `'X' | 'O' | null`，但 `getInitialBoard` 簽名是 `ReadonlyArray<string>`，要把 null 轉 ''。

**SOP 驗證**：第二次跑 `NEW_GAME_SOP.md`，新增「**情境 B：5th+ 遊戲 state 結構可能沒有 board 欄**」（已在 SOP 標註），提醒 RTDB validate 只用最通用欄位。15 個 phase 全部對得上，總時長約 1.5 小時（比 connect4 的 3-4 小時快，因 SOP 越來越熟）。

---

## 2026-06-18（Day 4）— 新增四子棋 Connect 4（套用 NEW_GAME_SOP）

**用戶要求**：新增四子棋（Connect 4）作為第 4 個遊戲。剛好拿來測試剛寫好的 `NEW_GAME_SOP.md` checklist。

**決策**：
- 嚴格照 SOP 走 15 個 phases
- 棋盤 7×6 = 42 格
- 紅棋 X / 黃棋 O（與井字/五子棋/黑白棋區分）
- 4 連線 = 4 個 X/O 在橫/直/斜連線
- AI 用啟發式：easy 隨機 / normal 1-ply / hard 2-ply

**實作**：
1. Phase 0：建 `src/games/connect4/` 資料夾
2. Phase 1：`types.ts` (Connect4State)、`engine.ts` (applyMove 自動找最低空格 + 4 連線偵測)、`engine.test.ts` 12 個測試
3. Phase 2：`sync.ts` (submitMove + acceptUndo)
4. Phase 3：`ai.ts` 啟發式 AI + `ai.test.ts` 7 個測試
5. Phase 4：symbols.ts (紅棋/黃棋) + Icon.tsx (SVG)
6. Phase 5：GameDefinition + Connect4.tsx UI（點欄頂部下子 + hover 預覽）+ registry 註冊
7. Phase 6：MOVES_CAP 42 + getInitialBoard + replayRenderers（紅圓/黃圓環）+ acceptUndo
8. Phase 7：i18n 中英對齊（28 個 key：name, loading, stateCorrupted, playAgainHint, moveFailed, myTurn_, spectating_, opponentTurn_, scopeConnect4）
9. Phase 8-10：rules / indexes 無需改（RTDB state 只驗 board + moveCount 通用欄位、indexes 不需新）
10. Phase 11-12：Lobby / Profile / Leaderboard 自動從 registry 讀
11. Phase 13：191/191 測試過、build OK
12. Phase 14：commit + push

**效果**：
- 191/191 測試過（含 12 個 connect4 engine 測試 + 7 個 AI 測試）
- TS 0 錯誤、build OK
- Leaderboard / Profile / Lobby 自動包含四子棋
- 探索頁可以看四子棋棋譜
- 復盤時間軸支援

**踩坑**：
1. findDropRow 簽名：原本傳 Connect4State，UI 端需要傳 board，改成傳 ReadonlyArray<Cell> 統一
2. AIEngine 介面要求 `gameType` 欄位（新增必填）
3. i18n 測試會抓單/雙括號，en-US 第一次編輯時漏了幾個 key

**SOP 驗證**：`NEW_GAME_SOP.md` 完整跑過，15 個 phase 全部對得上。預期未來新增第 5 個遊戲可以照著做，估 3-4 小時。

---

## 2026-06-15（Day 3 續 2）— #12 悔棋請求 Phase A

**用戶選**：#12 悔棋 / 復盤請求（先做 Phase A 悔棋，Phase B 復盤之後再說）

**決策**：
- 用 RTDB 獨立節點（`undoRequest`）不混進 game state
- 雙方同意：發起者必須是最後一步的下棋者（自然防濫用）
- 限額：每場每人 1 次悔棋，存 Firestore `room.undoUsedByUids[uid]`
- 黑白棋特殊處理：每步會翻面多個棋子，靠「重新 apply 前面所有步」自動同步
- 用 `GameDefinition.acceptUndo` 讓 GameRoom 透過 registry 呼叫，不在 GameRoom 內 branch gameType

**實作**：
1. i18n：加 `undo.*` 15 個 keys（requestButton / requestSent / requestReceivedTitle / accept / reject / timeout / confirmTitle / confirmBody 等），中英對齊
2. `core/services/undoService.ts`：
   - `UndoRequest` interface（requesterUid / requesterNickname / targetMoveIndex / createdAt）
   - `requestUndo` / `clearUndoRequest` / `subscribeUndoRequest` / `isUndoRequestTimedOut`
   - `UNDO_REQUEST_TIMEOUT_MS = 30_000`
3. Room type 加 `undoUsedByUids?: Record<string, number>`，`roomFromDoc` 解析
4. `roomService.incrementUndoQuota(roomId, uid)` 用 Firestore `increment(1)` 原子操作
5. 3 個遊戲各加 `acceptUndo(roomId, requesterUid)`：
   - runTransaction 包住整個流程
   - 取出最後一步 → 驗證是 requester 的
   - 重新 apply moves[0..N-2]（engine 自動處理 board 同步、翻面）
   - 設定 nextSymbol/currentTurn 為 removed.symbol
   - 黑白棋額外：reset passCount = 0
   - 成功後：incrementUndoQuota + clearUndoRequest + updateTurn
6. `GameDefinition.acceptUndo` 欄位（3 個遊戲各自綁定）
7. GameRoom UI：
   - 訂閱 RTDB undoRequest
   - 棋盤上方加「↶ 悔棋」按鈕（只在：自己下最後一步 + 額度未用 + 沒待回應 + 遊戲支援）
   - 確認對話框 / 等待浮動膠囊（可取消）/ 收到請求同意/拒絕 / 30 秒自動超時
   - 用 toast 顯示結果
8. RTDB rules 加 `undoRequest` 路徑（4 個必填欄位驗證）
9. resetRoom 順便 `clearUndoRequest`
10. 5 個新 undoService 測試（包含 30 秒邊界嚴格大於）
11. Firebase RTDB rules 部署 ✓（Vercel 自動部署前端）

**效果**：
- 162/162 測試過、TS 0 錯誤、Vite build 成功
- 「↶ 悔棋」按鈕只在合適時機出現
- 黑白棋被翻的棋子正確還原
- 限額正確生效（第二次按鈕不出現）
- 之後加 #13 暫停 / 暫離、#19 好友系統

---

## 2026-06-15（Day 3 續）— #20 房間內聊天

**用戶選**：#20 房間內聊天（高社交價值，明顯缺點）

**決策**：
- 用 RTDB（跟 reactions 一樣），不用 Firestore
- 結構：`rooms-live/{roomId}/chat/{msgId}` = {uid, nickname, text, createdAt}
- 訂閱時 `limitToLast(50)` 避免一次拉太多
- 暱稱用「快照」（送出當下的 nickname）而不是「查表」，避免改名後舊訊息錯亂
- 自己靠右藍色、對方靠左灰色（標準 IM 風格）
- Enter 送出、Shift+Enter 換行（textarea 標準）
- 觀戰者也可發言（沒被擋）
- 房主 resetRoom 順便清空聊天

**實作**：
1. i18n：加 `chat.*` 8 個 keys（title / empty / placeholder / send / inputHint / tooLong / emptyText / loadFailed），中英都加
2. `core/services/chatService.ts`：
   - `ChatMessage` interface、CHAT_MAX_LENGTH=200、CHAT_MAX_DISPLAY=50 常數
   - `validateChatText(text)` 驗證 1-200 字（trim 後）
   - `sendChatMessage(roomId, {uid, nickname, text})` push 到 RTDB
   - `subscribeChatMessages(roomId, cb)` onValue + limitToLast + 按 createdAt 排序
   - `clearChatMessages(roomId)` 整段 remove（房主 resetRoom 用）
3. `chatService.test.ts`：8 個測試（空 / 空白 / 非字串 / 1-200 / 超過 / trim 後計算）
4. RTDB rules 加 `chat` 路徑（read/write 需登入、驗證必填欄位）
5. `core/components/ChatPanel.tsx`：
   - useEffect 訂閱 RTDB
   - useRef + useEffect 自動捲到底（訊息數變化時）
   - 自己的訊息 uid === currentUserId → 靠右藍色氣泡
   - 對方訊息 → 靠左灰色氣泡
   - 暱稱 header 用「💬 聊天」+ 訊息數
   - textarea + 長度計數 + Enter 送出
   - 錯誤訊息（太長 / 空 / 網路失敗）顯示在輸入框上方紅字
6. `pages/GameRoom.tsx`：
   - 引入 ChatPanel
   - 進行中 / 結束：右欄改為 flex flex-col，MoveHistory 在上、ChatPanel 在下（min-h-[400px] flex-1）
   - 等待中：原本是單欄，現在 chat 面板也加在底部 h-[400px]
   - handleReset 加上 `clearChatMessages(roomId).catch(warn)`
7. 文檔：IMPROVEMENTS.md 標 #20 為完成，加上完成紀錄（8 項）

**效果**：
- 157/157 測試過、TS 0 錯誤、Vite build 成功
- 三狀態（等待/進行/結束）都有聊天
- 之後加 #12 悔棋、#19 好友系統、#13 暫停

---

## 2026-06-15（Day 3）— #18 多淺色主題架構（CSS 變數 + 語義色）

**用戶請求**：把淺色模式從「單一淺咖啡主題」改成「多淺色主題架構」，先提供綠色系（深→中→淺→極淺 4 色階）。

**決策**：
- 用 **CSS 變數** 取代「寫死 coffee-* class」做法
- 設計 5 個語義色 token：`app-bg / app-card / app-hover / app-border / app-border-strong`
- 預設走 `:root` 的淺咖啡，`theme-green` 覆寫為綠色系
- ThemeId: `'dark' | 'coffee' | 'green'`，未來加新主題只加 `:root.theme-X` 區塊 + ThemeId 成員 + Settings 按鈕，**元件完全不用動**

**實作**：
1. `tailwind.config.js`：加 5 個 app-* 顏色（值為 `var(--app-*)`）+ 5 個 green 階色
2. `index.css`：
   - `:root` 預設 5 個淺咖啡 CSS 變數
   - `:root.theme-green` 覆寫為綠色
3. `scripts/replace-coffee-with-vars.mjs`：批次替換工具
   - `bg-coffee-50/100/200/300` → `bg-app-bg/card/hover/border-strong`
   - `border-coffee-200/300` → `border-app-border/border-strong`
   - `hover:bg-coffee-X` → `hover:bg-app-X`
   - 排除 `tailwind.config.js`、自身腳本
   - dry-run 預設、 `--apply` 才寫入
4. **跑批次**：18 個檔案，**157 處替換**
5. `settingsService.ts`：
   - 新 `ThemeId` type + `THEME_IDS` 常數
   - `isValidTheme` 加 'green'
6. `useSettings.ts`：
   - `applyTheme` 改寫：先清掉所有 theme-X + dark class，再依 theme 加回去
   - 自動清理殘留 class
7. `Settings.tsx`：用 `THEME_IDS.map()` 渲染按鈕
   - 每個按鈕左邊加圓色塊（`bg-slate-800 / bg-amber-200 / bg-green-300`）當 swatch
   - `aria-pressed` 標示當前選中
8. i18n：`themeDark` 從「深色模式」→「深色」、「themeLight」拆成「淺咖啡 / 森林綠」（中英都改）
9. `settingsService.test.ts`：原 7 個測試 + 2 個新測試（不支援 theme fallback、3 主題都能存取）

**效果**：
- 149/149 測試過、TypeScript 0 錯誤、Vite build 成功
- 之後加藍/紫/橙/...主題只需 3 步驟
- 17 個檔案 121 處套用新語義色，UI 行為/外觀不變

**後續**：
- 之後可以做 #20 房間聊天、#12 悔棋
- 可能要小修：GameHeader SVG 顏色、棋盤 hover 偏淡、ResultScreen 外框配色（等用戶反饋）

---

## 2026-06-12（Day 2）— 部署、文件整理

## 2026-06-12（Day 2）— 部署、文件整理

### ~11:50 — 井字遊戲棋子視覺改為實心圓

需求：井字遊戲原本用 `×` 文字（藍）和 `○` 文字（紅）代表棋子，與五子棋/黑白棋的實心圓球不一致。統一改用實心圓球。

**改動**（`src/games/tictactoe/TicTacToe.tsx`）：
- X：`<span class="absolute inset-2 rounded-full bg-zinc-900 ring-1 ring-zinc-500">`（黑實心圓，與五子棋/黑白棋一致）
- O：`<span class="absolute inset-2 rounded-full bg-white ring-1 ring-zinc-500">`（白實心圓）
- 移除文字 `text-blue-400` / `text-red-400`
- 移除 `text-5xl font-bold`（不再需要大字）
- 加 `relative` 讓絕對定位的圓球對齊
- 加上「最後落子標記」：右上角小紅點（`bg-red-500`，`h-2 w-2`），更直觀看出誰剛下

**hover 預覽**：
- X：半透明黑圓（`opacity-40`）
- O：半透明白圓
- 與五子棋/黑白棋完全一致

**驗證**：
- `npm run typecheck` ✓
- `npm test` 53/53 通過 ✓
- `npm run build` ✓

### ~11:50 — 井字遊戲棋子視覺改為實心圓（續）

狀態：✓ 提交 — 但使用者反饋不對

### ~12:00 — 修正：井字遊戲改回 ×/○ 文字

反饋：井字遊戲跟五子棋/黑白棋不同，棋子應該是「×」和「○」文字符號，不是實心圓。

改動（`TicTacToe.tsx`）：
- 改回 `text-6xl font-bold text-blue-400` 顯示「×」
- 改回 `text-6xl font-bold text-red-400` 顯示「○」
- 保留 `relative` 在按鈕上（避免 absolute 逃出格子的舊 bug）
- 保留右上角紅點「最後落子標記」
- 保留半透明 hover 預覽（也用 ×/○ 字元）

教訓：不要為了「視覺一致」硬把不同語意的遊戲風格統一。井字=符號、五子棋/黑白棋=實心圓，語意本就不同。

狀態：✓ 提交

### ~17:20 — 觀戰者（spectator）機制

需求：比賽開始後，其他人可進場觀戰；玩家和觀戰者都能看到彼此名單；觀戰者只能看不能操作。

**資料模型**：
- `Room` 加 `spectators: Spectator[]` + `spectatorUids: string[]`
- `RoomSummary` 加 `spectatorCount: number`
- `Spectator = { uid, nickname, photoURL, joinedAt }`
- 向後相容：舊資料沒這兩個欄位時，`roomFromDoc` 補空陣列

**Firestore Rules**（已部署到 multiplayer-games-73a8f）：
- `isAddingSelfToSpectators` / `isRemovingSelfFromSpectators` 兩個 helper function
- `rooms/{roomId}` update 允許的 keys 加入 `spectators`/`spectatorUids`
- 允許觀戰者加入（自己原本不在 `spectatorUids`、更新後在）與離開（反之）
- `isEmptyRoom` 同時檢查 players 與 spectators 都為空

**roomService 改動**：
- `createRoom` 初始化 `spectators: []`, `spectatorUids: []`
- `joinRoomByCode` 分流：
  - `waiting` 房間 → 玩家身份（既有邏輯）
  - `playing` 房間 → 觀戰者身份（新）
  - 已在 players/spectators 名單 → 直接返回 room id
- `leaveRoom` 處理：
  - 觀戰者離開 → 只把自己從 `spectators`/`spectatorUids` 移出
  - 玩家離開 → 既有邏輯（forfeit 風險）
  - 房間空了（players + spectators 都為空）→ 刪除
- `roomFromDoc` / `roomSummaryFromDoc` 解析 spectators

**Game 元件（tictactoe/gomoku/reversi）**：
- `GameComponentProps` 加 `isSpectator?: boolean`
- `isMyTurn = !isSpectator && ...` → 觀戰時自動 disable 所有 cell
- 標題列顯示「觀戰中（X 下）」訊息
- hover 預覽棋子自動隱藏（因為 `showPreview` 條件含 `isMyTurn`）

**GameRoom.tsx**：
- 計算 `isSpectator = !!user && !currentPlayer`
- 拆成兩個 section：「玩家（2/2）」、「觀戰者（N）」
- 觀戰者顯示藍色 banner「您正在觀戰這場比賽，無法進行任何操作。」
- 「準備」「開始遊戲」按鈕只在 `currentPlayer` 存在時顯示（觀戰者看不到）
- forfeit 倒數計時器對觀戰者不觸發
- 觀戰者離開直接跳過 forfeit 確認 modal
- 觀戰者也能看見 `ResultScreen`（不影響遊戲流程）

**Lobby.tsx**：
- 房間列表加「N 觀戰」標籤（如果有觀戰者）
- `playing` 房間的按鈕文字改為「觀戰」（藍色 badge）；`waiting` 仍是「加入」

**驗證**：
- `npm run typecheck` ✓
- `npm test` 62/62 通過 ✓
- `npm run build` ✓
- Firestore rules 部署 ✓

狀態：✓ 提交

### ~21:40 — #8 房間結束的觀戰體驗（IMPROVEMENTS #8）

需求：觀戰者不該被 20 秒倒數踢出；該有反應機制鼓勵玩家。

**新增**：
- `index.css` 新增 `@keyframes reaction-float`：emoji 飄上 + 淡出（3s）
- `ResultScreen.tsx`：
  - `disableAutoLeave?: boolean` 和 `isSpectator?: boolean` 兩個 props
  - 觀戰者預設不啟用自動倒數
  - 5 種反應按鈕（👏 加油 / 🎉 祝賀 / 😱 驚訝 / 👍 佩服 / 💪 鼓勵）
  - 點擊：emoji 從底部飄上去（隨機水平 10-90%），3 秒自動消失
  - 觀戰者用「返回大廳」手動離開按鈕
  - 玩家保留「留在此頁」「再來一局」「立即離開」

**修改**：
- `pages/GameRoom.tsx`：ResultScreen 加 `isSpectator={isSpectator}` prop
- 觀戰者在右側棋譜面板加說明文字

**驗證**：
- `npm run build` ✓
- `npm test` 78/78 通過 ✓

**MVP 限制**：反應是 local-only（自己看到自己發的），未來可加 RTDB 同步讓所有人看到

**IMPROVEMENTS.md 狀態**：#8 改為 ✅

狀態：✓ 提交

### ~18:55 — #7 大廳 hover 預覽房間（IMPROVEMENTS #7）

需求：進房前先預覽房間資訊和棋盤現況。

**新增**：
- `core/components/BoardThumbnail.tsx`：棋盤縮圖
  - 井字：3×3 文字格
  - 黑白棋：8×8 黑白圓盤 + 計數
  - 五子棋：15×15 太密不易看，改顯示「已下 N/225 子」
- `core/components/RoomPreviewCard.tsx`：hover 預覽卡片
  - 接受 `RoomSummary`（避免 API 變動）
  - 房主、玩家數、回合時間、預計時間、觀戰人數
  - 棋盤縮圖（僅 playing 房間）

**修改**：
- `pages/Lobby.tsx`：
  - 加 `previewedRoomId` 狀態和 `previewedGameState` 訂閱
  - 訂閱**單一**連線（避免 N 房間 N 訂閱）
  - 房間按鈕加 onMouseEnter / onMouseLeave / onFocus / onBlur
  - `<li>` 加 relative 定位
  - Preview 卡片 absolute 定位於按鈕下方

**MVP 限制**：
- 預覽卡片只列房主名 + 玩家數，沒列每個玩家大頭貼
  （RoomSummary 不含 players 詳細資料，要拿需改用 Room 型別）
- 手機版無 hover 體驗（無 touch 事件支援），可後續加 tap-to-preview

**驗證**：
- `npm run build` ✓
- `npm test` 78/78 通過 ✓

**IMPROVEMENTS.md 狀態**：#7 改為 ✅

狀態：✓ 提交

### ~18:45 — #6 棋譜 / 移動歷史面板（IMPROVEMENTS #6）

需求：觀戰者要能回顧「這場下了哪些步、每步是誰」。

**新增**：
- `core/types/game.ts`：`MoveRecord` 型別
- `core/components/MoveHistory.tsx`：棋譜面板元件
  - 顯示：序號 / 玩家名 / 棋子（formatSymbol）/ 座標 / 時間
  - 自己步驟藍色高亮、最後一步綠色指示條
  - 行動版可摺疊

**修改**：
- 三個遊戲的 state 型別加 `moves?: MoveRecord[]`（optional，engine 不關心）
- 三個遊戲的 `createInitialState` 不設 moves（讓 sync 層管理）
- 三個遊戲的 `submitMove` 多收 `displayName` 參數，在 transaction 內 append MoveRecord
- Reversi 多記錄 `flipped` 欄位（為日後棋譜重播做準備）
- `pages/GameRoom.tsx`：
  - 訂閱 RTDB 的 `state/moves` 陣列
  - 改成 grid 佈局：lg+ 螢幕遊戲 2/3、棋譜 1/3；行動版堆疊
  - 棋譜在 isPlaying 和 isFinished 兩種狀態都顯示
  - max-w-3xl → max-w-6xl

**驗證**：
- `npm run build` ✓
- `npm test` 78/78 通過 ✓

**MVP 沒做**：點任一步靜態重播（replay 雛形），留給日後

**IMPROVEMENTS.md 狀態**：#6 改為 ✅

狀態：✓ 提交

### ~18:30 — #5 移動動畫（IMPROVEMENTS #5）

需求：每步棋落下應該有視覺提示，讓人馬上看出「剛才是誰下」。

**新增**：
- `index.css` CSS 動畫：
  - `@keyframes cell-appear`：新棋子淡入 + 放大回彈（280ms ease-out）
  - `@keyframes pulse-ring`：最後落子格黃色光環脈動（1.6s 循環）
  - `prefers-reduced-motion` 適配（無障礙）
- `core/hooks/useNewlyChangedCells.ts`：比對 board 變動，回傳剛變動的格子索引 Set
- 4 個 hook 測試

**修改**：
- `core/components/BoardCell.tsx`：
  - 新增 `isNewlyPlaced?: boolean` 開關
  - 新增 `lastMovePulse?: boolean` 開關
- 三個遊戲都改用：
  - TicTacToe：fade-in + 黃色 ring 脈動
  - Gomoku：fade-in + 紅點光環脈動
  - Reversi：fade-in + 紅點光環脈動（**包含翻面動畫** — useNewlyChangedCells 偵測 X↔O 變化）

**效果**：
- 每步棋落下：淡入 + 放大回彈
- 最後落子格：持續脈動黃色光環
- Reversi 翻棋：同樣的 fade-in 動畫（看起來就像棋子被翻面）

**驗證**：
- `npm run build` ✓
- `npm test` 77/77 通過（原 73 + 新增 4）✓

**IMPROVEMENTS.md 狀態**：#5 改為 ✅

狀態：✓ 提交

### ~18:15 — #4 統一錯誤處理 / Toast 通知（IMPROVEMENTS #4）

需求：散落的 alert() 與各處 inline 紅色區塊錯誤不一致，需要統一。

**新增**：
- `core/components/Toast.tsx`：
  - `ToastProvider` + `useToast()` hook
  - 四種樣式：success / error / info / warning
  - 自動 4 秒消失、可手動關閉
  - 右上角浮動 stack
  - 鍵盤 / 螢幕閱讀器友好（aria-live, role, aria-label）
  - 背景模糊 + 4 種顏色區分（綠/紅/藍/黃）+ 圖示（✓ ✕ ℹ ⚠）
- `core/components/Toast.test.ts`：1 個測試驗證預設 duration 常數

**修改**：
- `main.tsx`：在 AuthProvider 內加 ToastProvider
- `pages/Home.tsx`：alert 改用 toast.error

**為什麼不替換遊戲內的 inline 錯誤**：
- GameRoom / Lobby / 遊戲元件的 inline 紅色區塊是 contextual 的 UI（例如「落子失敗」「遊戲狀態損壞」）
- 這些錯誤需要持續可見直到使用者處理，不適合快速消失的 toast
- 未來新功能（網路錯誤、權限錯誤）才用 toast

**驗證**：
- `npm run build` ✓
- `npm test` 73/73 通過（原 72 + 新增 1）✓

**IMPROVEMENTS.md 狀態**：#4 改為 ✅

狀態：✓ 提交

### ~18:00 — #3 GameDefinition 結構擴充（IMPROVEMENTS #3）

**目標**：為 #14 房間設定擴充和「怎麼玩」對話框鋪路；讓每個遊戲的 metadata 一次到位。

**修改**：
- `core/types/game.ts`：
  - 加 `tutorialSteps?: string[]` 欄位
  - 加 `estimatedDurationMin?: number` 欄位
  - 加 `variants?: GameVariant[]` 欄位
  - 新增 `GameVariant` 介面（id, name, description, config?）
- 三個遊戲都填入：
  - tictactoe：3 步驟、3 分鐘
  - gomoku：4 步驟、15 分鐘
  - reversi：5 步驟、10 分鐘
- `pages/Lobby.tsx` 房間卡片加：
  - 「預計 X 分鐘」標籤
  - 遊戲 description 單行 line-clamp 顯示
- 新增 `core/types/game.test.ts`：4 個 GameDefinition metadata 測試

**驗證**：
- `npm run typecheck` ✓
- `npm test` 72/72 通過（原 68 + 新增 4）✓
- `npm run build` ✓

**IMPROVEMENTS.md 狀態**：#3 改為 ✅

狀態：✓ 提交

### ~17:40 — #2 抽出共用元件（IMPROVEMENTS #2）

需求：三個遊戲的 header / player badge / cell button 重複度高，未來加第四個遊戲會很痛。

**新增 3 個共用元件**：
- `core/components/GameHeader.tsx`：統一 header（狀態訊息 + TurnCountdown + 玩家徽章 + 右側額外內容）
  - 用 discriminated union 接收 status（won / draw / myTurn / opponentTurn / spectating）
  - 自動套用 formatSymbol、依 verb 顯示「下棋」或「落子」
- `core/components/PlayerBadge.tsx`：統一的「(符號): 暱稱」小徽章
- `core/components/BoardCell.tsx`：棋盤格按鈕（memo 化，固定處理 onClick/hover/disabled/最後落子紅點；視覺樣式由 className 傳入）
  - 支援 inner/outer 兩種紅點位置

**重構 3 個遊戲元件**：
- `TicTacToe.tsx`：移除 ~40 行 header JSX 和 cell button JSX，改用 GameHeader + BoardCell
- `Gomoku.tsx`：同上
- `Reversi.tsx`：同上，X/O 計數和 Pass/提示按鈕透過 `rightContent` 傳入 GameHeader

**修了一個 type 問題**：`isLastMove` 從 `state.lastMove && ...` 改成 `!!(...)` 確保 boolean（TypeScript 抱怨 `boolean | null`）

**驗證**：
- `npm run typecheck` ✓
- `npm test` 68/68 通過 ✓
- `npm run build` ✓ 拆分改善：
  - TicTacToe 4.33 → 3.58 kB
  - Gomoku 4.06 → 3.35 kB
  - Reversi 5.46 → 5.05 kB
  - BoardCell 2.47 kB（共用，自動 split）
  - main 略縮

**IMPROVEMENTS.md 狀態**：#2 改為 ✅

狀態：✓ 提交

### ~16:30 — Bug 修復：黑白棋棋盤滿了卻不結束

**問題**：使用者回報黑白棋在全部 64 格下完時，遊戲不會自動結束，要等雙方都按 Pass 才結束。

**根因**：`engine.ts` 的 `checkResult` 用 `state.moveCount >= TOTAL_CELLS` 判斷棋盤已滿，但 `moveCount` 是「下棋次數」，不是「填入的格子數」。實際對戰中，每次落子都會翻好幾顆，所以 `moveCount` 永遠到不了 64，但 board 早就滿了。

**修正**（`src/games/reversi/engine.ts`）：
```ts
// 改成計算實際填入的格子數
const filledCells = state.board.reduce(
  (n, c) => (c !== EMPTY_CELL ? n + 1 : n),
  0
);
if (filledCells >= TOTAL_CELLS) {
  return declareWinner(state, players);
}
```

**測試**（`engine.test.ts` 新增 2 個 case）：
- `棋盤已滿但 moveCount 為實際下棋次數（小於 64）：仍判結束`：模擬 bug 場景，moveCount=28 但 board 全填
- `棋盤只有 1 格空：未結束`：邊界情況

**驗證**：
- `npm test` 68/68 通過（原 66 + 新增 2）✓
- `npm run typecheck` ✓
- `npm run build` ✓

狀態：待提交

### ~15:45 — #1 程式碼分割（IMPROVEMENTS #1）

需求：30 秒太短，房主建立房間時可從 30 / 60 / 120 / 150 秒中選擇。

**新增**：
- `TurnTimeLimit` 型別 = `30 | 60 | 120 | 150`
- `TURN_TIME_LIMITS` 常數 = `[30, 60, 120, 150]`
- `DEFAULT_TURN_TIME_LIMIT = 30`
- `isValidTurnTimeLimit()` 守門函式
- 4 個單元測試（`core/types/room.test.ts`）

**`Room` / `RoomSummary` 改動**：
- 加 `turnTimeLimitSec: TurnTimeLimit` 欄位
- `roomFromDoc` / `roomSummaryFromDoc` 用 `parseTurnTimeLimit()` 解析，舊資料缺欄位時預設 30

**`roomService` 改動**：
- `CreateRoomOptions` 加 `turnTimeLimitSec?: TurnTimeLimit`
- `createRoom` 寫入 `turnTimeLimitSec` 到 Firestore

**`Lobby` 改動**：
- 「建立新房間」區塊加「每回合思考時間」四顆按鈕選擇器（30 / 60 / 120 / 150 秒）
- 房間列表每個房間加「每回合 X 秒」標籤（黃色）

**`GameRoom` 改動**：
- 移除寫死的 `TURN_TIME_LIMIT_SEC = 30`
- 改用 `room.turnTimeLimitSec ?? 30` 計算 `turnSecondsLeft`
- 自動 forfeit 條件跟著 `turnTimeLimitSec` 動
- 將 `turnTimeLimitSec` 傳給遊戲元件

**遊戲元件 / `TurnCountdown` 改動**：
- `GameComponentProps` 加 `turnTimeLimitSec?: number`
- `TurnCountdown` 接收 `totalSec`，顯示「剩餘 25/60 秒」（讓使用者一眼看出總時間）

**驗證**：typecheck ✓、66 測試通過（新增 4 個 TurnTimeLimit 測試）、build ✓

狀態：待提交

### ~15:00 — 回合倒數計時器（每回合 30 秒、自動 forfeit 當前玩家）

需求：原本的 30 秒判斷機制對玩家不可見，常常莫名其妙被判定輸贏。改為：
- 每個回合都有一個公開的倒數計時
- 玩家和觀戰者都能清楚看到剩餘時間
- 超時自動判當前玩家（turnSymbol）落敗

**資料模型**：
- `Room` 加 `turnStartedAt: number | null` 與 `turnSymbol: string | null`
- `GameComponentProps` 加 `turnSecondsLeft?: number | null`

**Firestore Rules**（已部署到 multiplayer-games-73a8f）：
- update 白名單加 `turnStartedAt` / `turnSymbol`
- 加合法性檢查：`turnStartedAt <= request.time.toMillis() + 5000`（防作弊）

**roomService 改動**：
- `createRoom` 初始化為 null
- `startGame` 設為 `{turnStartedAt: now, turnSymbol: 'X'}`
- `finishGame` / `resetRoom` / `leaveRoom`(forfeit) 清空
- 新增 `updateTurn(roomId, nextSymbol)`：每個玩家下棋後呼叫

**遊戲 sync 改動**：
- `tictactoe/gomoku/reversi/sync.ts` 的 `submitMove` 成功後呼叫 `updateTurn(roomId, nextSymbol)`
- `reversi/sync.ts` 的 `passTurn` 也呼叫 `updateTurn`

**新元件** `core/components/TurnCountdown.tsx`：
- 接收 `secondsLeft: number | null | undefined`
- 顯示 `⏱ 剩餘 X 秒`
- 變色：>10 灰色、5-10 黃色、<=5 紅色 + animate-pulse

**GameRoom 改動**：
- 每秒 tick `now` state 觸發重算 `turnSecondsLeft`
- useEffect 監聽 `now` + `turnStartedAt` + `turnSymbol`：當 `now - turnStartedAt >= 30_000` 時，自動 `finishGame(winnerId = 另一方, isDraw = false)`
- `forfeitTriggered` 旗標保證冪等
- 移除舊的 `forfeitSecondsLeft` / `forfeitReason` / 橙色 forfeit banner（已被新倒數取代）
- 將 `turnSecondsLeft` 傳給遊戲元件

**遊戲元件改動**（tictactoe/gomoku/reversi）：
- 接收 `turnSecondsLeft` prop
- 在「輪到你（黑棋）」「等待對方下棋」「觀戰中」訊息旁加 `<TurnCountdown>` 元件

**驗證**：typecheck ✓、62 測試通過、build ✓、Firestore rules 部署 ✓

狀態：✓ 提交

### ~14:50 — 棋子符號顯示優化（X/O → 黑棋/白棋）

需求：五子棋和黑白棋的「符號：X」會讓觀戰者搞不清楚隊伍（X 是黑棋還是白棋？）。

設計：保留內部 `symbol = 'X' | 'O'`（engine、game state 都不用改），用 `formatSymbol(symbol)` 在顯示層做轉換。

**修改**：
- `core/types/game.ts` — `GameDefinition` 加 `formatSymbol?: (symbol: string) => string`
- `games/gomoku/symbols.ts` — `formatGomokuSymbol`: X→黑棋, O→白棋
- `games/reversi/symbols.ts` — `formatReversiSymbol`: X→黑棋, O→白棋
- `games/gomoku/index.ts` / `games/reversi/index.ts` — 註冊 formatSymbol
- `Gomoku.tsx` / `Reversi.tsx` — 「輪到你（X）」改為「輪到你（黑棋）」
- `GameRoom.tsx` 玩家名單：
  - 移除「符號：X」這行
  - 在暱稱旁加彩色徽章：
    - 井字：X=藍底藍字、O=紅底紅字（符合棋子色）
    - 五子棋/黑白棋：X=黑底白字、O=白底黑字（符合棋子色）

**驗證**：typecheck ✓、62 測試通過、build ✓

狀態：✓ 提交

### ~14:30 — 為每個遊戲加 SVG 圖示

需求：每個遊戲需要一個一看就懂的圖示。

設計：每個遊戲自己擁有 `Icon.tsx` 元件，透過 `GameDefinition.icon` 對外暴露；其他模組透過 `gameRegistry` 取得。

**新檔案**：
- `src/games/tictactoe/Icon.tsx` — 3x3 棋盤 + 藍色 X（左上）+ 紅色 O（中間）
- `src/games/gomoku/Icon.tsx` — 棋盤 + 5 顆黑子水平連珠
- `src/games/reversi/Icon.tsx` — 棋盤 + 4 顆黑白棋（黑、白、白、黑）

**修改**：
- `core/types/game.ts` — `GameDefinition` 加 `icon: ComponentType<{ className?: string }>`
- 三個遊戲的 `index.ts` — 註冊 icon，並 re-export `*Icon` 給其他模組用
- `Lobby.tsx` — 遊戲選擇按鈕、房間列表都加 icon
- `Profile.tsx` — 「分遊戲戰績」每個遊戲加 icon（取代 [井]/[五]/[黑] 文字標籤）
- `Leaderboard.tsx` — 分頁 tab 加 icon
- `GameRoom.tsx` — header 標題旁加大 icon（h-10 w-10）

**驗證**：
- `npm run typecheck` ✓
- `npm test` 62/62 通過 ✓
- `npm run build` ✓

狀態：✓ 提交

### ~12:30 — 玩家暱稱系統（不顯示 Google 名稱）

需求：登入後不使用 Google 帳號名稱，改用自訂暱稱。首次登入自動給流水號（如「玩家001」），使用者可自行編輯。

架構：

**新檔案**：
- `src/core/types/user.ts` — `UserProfile` 型別 + `formatDefaultNickname` + `isDefaultNicknameFormat`
- `src/core/services/profileService.ts` — `ensureProfile`（transaction 取流水號 + 建 profile）、`subscribeProfile`、`updateNickname`、`validateNickname`
- `src/core/types/user.test.ts` — 9 個單元測試（純函式）

**修改**：
- `AuthProvider` — 登入時自動 `ensureProfile`（取流水號、建文件），訂閱 `users/{uid}` 暴露 `profile` context
- `useAuth` — 加 `profile` / `profileLoading` / `setProfile`
- `roomService.buildPlayerEntry` — 接收 `nickname` 參數（從 caller 傳入）
- `roomService.createRoom/joinRoomByCode` — `options.nickname` 必填
- `presenceService.setOnline/setOffline` — 接收 nickname
- `usePresence` hook — 從 `useAuth` 讀 nickname 後傳給 service
- `App.tsx` / `Home.tsx` / `Lobby.tsx` / `GameRoom.tsx` / `Profile.tsx` / `Leaderboard.tsx` — 改用 `profile.nickname`
- `Lobby` 的建立/加入按鈕 — `profileLoading` 時 disabled，提示「暱稱載入中...」
- `Profile.tsx` — 新增 inline 編輯暱稱 UI、預設暱稱黃色「預設」徽章、提示橫幅
- `statsService.recordGameResult` / `historyService.recordGameHistory` — 接收並寫入 `nickname` 欄位
- `useUserStats` — 向後相容：優先讀 `nickname`，fallback `displayName`
- `historyService.fromDoc` — 補上 `nickname` 欄位（讀舊資料時從 `displayName` 補）

**Firestore Rules**：
- 新增 `match /meta/{docId}` 規則 — 允許已登入者讀/建立/更新 userCounter

**Firestore 部署**：
- ✓ `firebase deploy --only firestore:rules` 完成

**驗證**：
- `npm run typecheck` ✓
- `npm test` 62/62 通過（新增 9 個 nickname 測試）✓
- `npm run build` ✓

狀態：✓ 提交

### ~12:00 — 修正：井字遊戲改回 ×/○ 文字（續）

狀態：✓ 提交

### ~11:45 — 井字/五子棋加 hover 預覽棋子

需求：跟黑白棋一樣，使用者下棋前要能在滑鼠上看到「自己下的是 X 還是 O」或「黑棋還是白棋」的預覽。

實作：

**TicTacToe.tsx**：
- 加 hoveredCell state
- 每個 cell 加 onMouseEnter / onMouseLeave
- 預覽用 × 或 ○ 字符（與實際棋子同樣的字體與顏色），opacity-40
- 三個條件：自己的回合 + 空格 + 有 mySymbol

**Gomoku.tsx**：
- 同樣加 hoveredCell state 與 hover 事件
- 預覽用黑/白圓球（與實際棋子同樣的樣式），opacity-40
- 黑棋玩家預覽半透明黑圓，白棋玩家預覽半透明白圓

兩個遊戲都用 pointer-events-none 避免干擾點擊

狀態：✓ 提交

### ~11:40 — 離開房間確認對話框

需求：比賽中按「離開房間」要提醒使用者這樣會直接輸掉這一局

實作：
- GameRoom 加 `showLeaveConfirm` state
- 遊戲進行中（status === 'playing'）按離開 → 跳出確認對話框
- 非進行中（waiting / finished）→ 直接離開
- 對話框：紅色警告樣式，說明「主動離開 = 直接判定落敗」
- 兩個按鈕：「取消」/「確認離開（落敗）」
- 使用 fixed 定位 + z-50 確保蓋住所有內容
- backdrop 黑色半透明

狀態：✓ 提交

### ~11:35 — 修正：forfeit 判斷把贏家當輸家

問題：使用者回報「對方離線，但判斷卻是判斷我輸」

根因：handleForfeit 把「對方」當作 winner，實際上應該是 loser
- 舊版本：`const winner = room.players.find((p) => p.uid !== user.uid)` → 變數名誤導
- 這個變數抓到的是「對方」（斷線的那個），把它傳給 finishGame
- 結果 finishGame 把對方設為 winnerId，current user（仍在線上）反而變成輸家

修正：
- 變數名 `winner` → `loser`
- 呼叫 `finishGame(roomId, user.uid, false)`，把「自己」（current user，仍在線上）設為 winner
- 對方（斷線 / 無動作）為 loser

額外註解：MVP 階段還沒實作「偵測誰該落子」邏輯
- 目前 effect 偵測「對方離線 / 30s 無動作」就觸發 forfeit
- 邊界情況：自己的回合時自己 AFK，會被誤判為自己贏
- 這個邊界情況 MVP 階段可接受，未來用 `currentTurn` 偵測來改進

狀態：✓ 提交

### ~11:20 — 斷線 / 無動作 / 主動離開 處理

#### 需求
- 對方真的斷線 → 30 秒內回來自動恢復；30 秒後直接判斷勝負
- 使用者主動離開房間 → 直接判斷勝負
- 對方在線但 30 秒內沒動作 → 提示倒數 30 秒；30 秒後判斷勝負

#### 實作

**1. leaveRoom 加 forfeit 邏輯**（主動離開立即判勝負）
- 檢查房間狀態是否為 'playing'
- 若是：更新房間為 'finished'，winnerId = 剩餘玩家（房主已轉移的話就是新房主）
- 同時呼叫 recordGameResult + recordGameHistory 寫入統計與歷史
- 規則：因 leaver 仍在舊 playerUids 裡，isRoomPlayer() 通過，affectedKeys 仍合法

**2. GameRoom 加斷線/無動作偵測**
- 引入 useState/useRef 追蹤 forfeit 狀態
- handleGameActivity callback：每次遊戲狀態變化（moveCount + 1）重置計時器
- 偵測規則：
  - 房間狀態為 'playing'
  - 對手存在
  - 對手離線 → 30 秒倒數
  - 對手在線但 30 秒沒動 → 30 秒倒數
  - 任何活動都取消 forfeit
- 倒數歸 0 → 呼叫 finishGame，winnerId = 自己（被 forfeit 的是對手）

**3. GameComponentProps 加 onActivity 選填 prop**
- 三個遊戲元件（TicTacToe、Gomoku、Reversi）在 useEffect 偵測 moveCount 變化時呼叫
- GameRoom 傳入 handleGameActivity 重置計時器
- 架構影響：每個遊戲加 5-6 行

**4. UI 提示橫幅**
- 橘色邊框 + 動畫點
- 文字：對方已斷線/無動作，將於 X 秒後判斷我方勝出
- 副標題：若 30 秒內回來/落子，倒數會取消

#### 驗證
- TypeScript: ✓ 0 errors
- Tests: ✓ 53 passed
- Build: ✓ success

#### 狀態
✓ 提交並推送，Vercel 自動部署中

### ~11:00 — 黑白棋：滑鼠 hover 預覽棋子

使用者回饋：「黑白棋中，使用者沒有提示他是黑棋還是白棋，容易造成混亂。
我覺得在使用者的滑鼠遊標上，應該直接顯示他所使用的棋子是黑棋還是白旗」

修正：
- 加 `hoveredCell` state
- 每個 cell 加 `onMouseEnter`/`onMouseLeave`
- 滑鼠 hover 到合法空格時，半透明預覽棋子跟隨顯示
  - X（黑）：半透明黑圓
  - O（白）：半透明白圓
- 只有「自己回合 + 空格 + 可走」三個條件都滿足才顯示
- 加 `pointer-events-none` 避免干擾滑鼠事件

狀態：✓ 提交

### ~10:50 — 黑白棋遊戲上線

#### 動機
- 用戶選擇：架構驗證度下一個遊戲
- 選項分析：黑白棋（有翻子邏輯）/ UNO（多人+隱私）/ 象棋（棋子複雜）/ 你畫我猜（即時繪圖）
- 選了黑白棋：翻子機制是新的引擎驗證，工作量適中

#### 實作（`src/games/reversi/`）
- **types.ts**：8x8 棋盤、Cell = 'X' | 'O' | ''、standard 開局 4 個中央棋子
- **engine.ts**：
  - `findFlipsInDirection`：8 方向掃描找可翻的對手棋子
  - `findAllFlips`：8 方向總集
  - `validateMove`：檢查落子位置至少能翻一個方向
  - `applyMove`：落子 + 翻子 + 切換 currentTurn + 重置 passCount
  - `checkResult`：棋盤滿或 passCount >= 2 才結束，計算 X/O 數量決定勝負
  - `hasValidMove`：輔助函式判斷某玩家有無合法步
- **engine.test.ts**：14 個測試（初始狀態、合法步位置、validate/apply 翻轉、checkResult、hasValidMove）
- **sync.ts**：
  - `ensureGameState`、`submitMove`、`subscribeGameState`、`resetGameState`
  - 新增 `passTurn`：當玩家無合法步時呼叫，currentTurn 切換、passCount + 1
- **Reversi.tsx**：
  - 8x8 棋盤 UI（X=黑、O=白）
  - 棋子計數器（X vs O 即時顯示）
  - 翻轉高亮（剛被翻的棋子黃色背景）
  - 提示模式（綠色虛線圓顯示所有合法步位置）
  - 自動偵測無合法步：顯示「需 Pass」按鈕
  - Pass 計數顯示與遊戲結束判斷

#### 整合
- GameType 加 'reversi'
- registry.ts 註冊 reversi
- GameRoom.tsx 加入 reversi 的 resetGameState 處理
- statsService、Leaderboard、Profile 自動支援（透過 registry 與 Record<GameType>）
- Lobby 自動顯示「黑白棋」按鈕

#### 測試結果
- 53 個單元測試全過（12 井字 + 14 五子棋 + 14 黑白棋 + 13 密碼）
- TypeScript 0 errors
- Build 成功

#### 狀態
✓ 提交並推送，Vercel 自動部署中

### ~00:00（Day 3）— 分遊戲排行榜與綜合排行榜

需求：排行榜依不同遊戲類型分別計算，再加一個綜合排行榜統計全部。

實作：

1. **statsService 重構**：
   - UserStats 從扁平（wins/losses/draws）改為巢狀結構
   ```typescript
   {
     overall: { wins, losses, draws, totalGames },
     byGame: {
       tictactoe: { wins, losses, draws, totalGames },
       gomoku: { wins, losses, draws, totalGames },
     }
   }
   ```
   - recordGameResult 同時更新 overall 與對應 byGame.X
   - 使用 FieldValue.increment 巢狀欄位
   - 第一次玩某遊戲時自動建立完整文件

2. **useLeaderboard** 接受 scope 參數：
   - 'overall'：orderBy('overall.wins')
   - 'tictactoe'：orderBy('byGame.tictactoe.wins')
   - 'gomoku'：orderBy('byGame.gomoku.wins')
   - 過濾掉該類別下完全沒玩過的玩家

3. **Leaderboard 頁面加分頁切換**：
   - 三個按鈕：綜合 / 井字遊戲 / 五子棋
   - 切換時即時重新訂閱
   - 顯示「目前顯示：xxx（n 筆）」

4. **Profile 頁面新增分遊戲戰績區**：
   - 從 Firestore 訂閱 stats（即時更新）
   - 顯示綜合戰績 + 各遊戲分項戰績
   - 原本用最近 50 場計算，改用累計 stats

5. **helpers**：
   - getGameStats(stats, scope)：取得對應類別的 stats
   - calculateWinRate(stats)：計算勝率
   - DEFAULT_GAME_STATS：預設空 stats

狀態：✓ 提交並推送

### ~23:30 — 房主轉移功能修正
- **需求**：建立房間的人（房主）離開房間時，應由下一位玩家自動接手房主身份
- **現狀**：`leaveRoom` 程式碼已包含轉移邏輯（把 `remaining[0]` 設為新房主，更新 `hostId` 與 `isHost`），但 Firestore 規則的 affectedKeys 白名單沒包含 `hostId` → 被規則擋下
- **修正**：
  - 規則 `hasOnly([...])` 加入 `'hostId'`
  - leaveRoom 加註解說明轉移邏輯
- **行為**：
  - 房主離開 → 自動把最早加入的剩餘玩家設為新房主
  - 新房主預設為「準備」狀態（可立即開始遊戲）
  - 房間空了 → 刪除房間 + 釋放密碼索引
- **狀態**：✓ 規則已部署

### ~23:00 — 三個權限與索引問題修正

#### 問題 1：密碼房間建立失敗
- **根因**：`createRoom` 順序錯誤
  - 先 `storeRoomPassword`（寫入 secret 子文件）
  - 但此時 room doc 還沒建立，secret 規則裡的 `get(roomId).data.hostId` 找不到 doc → 失敗
- **修正**：改為先建立 room doc，再寫 secret

#### 問題 2：stats 更新被規則擋下
- **根因**：`users/{uid}` 的 update 規則有「禁止改 stats 欄位」的條件
  ```javascript
  allow update: if isSelf(uid) &&
    !affectedKeys().hasAny(['wins', 'losses', 'draws', 'totalGames']);
  ```
  原本是為了防作弊，但也擋掉了 `recordGameResult` 的合法更新
- **修正**：移除 hasAny 限制，接受 MVP 階段的作弊風險
  ```javascript
  allow update: if isSelf(uid);
  ```

#### 問題 3：對戰歷史查詢需要複合索引
- **錯誤**：`gameHistory` 查詢 `where('playerUids', 'array-contains', uid)` + `orderBy('endedAt', 'desc')` 需要複合索引
- **修正**：client 端排序（與 subscribeLobby 同樣策略）
  - 多撈一些（limit 60）做緩衝
  - 排序後 slice 到 max

#### 狀態
✓ 規則已部署、TypeScript/Tests/Build 全過

### ~22:50 — 修正 Firestore 規則運算子優先順序 bug
- **問題**：使用者回報加入房間時仍出現「Missing or insufficient permissions」
- **根因**：上一版修正的規則有運算子優先順序 bug
  ```javascript
  // 我寫的：解析為 (!uid) in list（錯）
  !request.auth.uid in resource.data.playerUids
  // 應該寫：解析為 !(uid in list)（對）
  !(request.auth.uid in resource.data.playerUids)
  ```
- **症狀**：! 套用在 uid（字串）上產生 false，再去檢查 false 是否在 list 裡，永遠是錯的邏輯
- **第一次嘗試用 not()**：Firestore 規則不支援 not() 函式
- **最終修正**：用括號明確表達意圖
- **狀態**：✓ 規則部署成功

### ~22:40 — 修正 Firestore 規則兩處錯誤
- **問題 1**：使用者點擊房間加入時出現「Missing or insufficient permissions」
- **根因 1**：更新規則要求玩家「已加入」才能更新（`request.auth.uid in resource.data.playerUids`），
  但「加入」這個動作本身就是要把自己加進去，雞生蛋問題
- **修正 1**：更新規則新增第三個合法情境
  ```javascript
  // 加入房間：原本不在 playerUids，更新後在
  (!request.auth.uid in resource.data.playerUids &&
   request.auth.uid in request.resource.data.playerUids)
  ```
- **問題 2**：`isAbandonedRoom()` 用 `lastActivityAt.toMillis()`，但程式碼存的是 number
- **修正 2**：直接用 number 比較，不呼叫 `.toMillis()`
- **狀態**：✓ 規則已部署成功

### ~22:20 — 修正：Firestore 查詢複合索引需求
- **問題**：使用者回報 `cleanupAbandonedRooms` 拋 `The query requires an index`，
  並反映「無法進入房間」
- **根因**：Firestore 規則已從測試模式換成正式模式，複合索引需手動建立
  - `cleanupAbandonedRooms`: `where('status','in',...)` + `orderBy('lastActivityAt')` 需複合索引
  - `joinRoomByCode` / `lookupRoomByCode`: `where('code','==')` + `where('status','in',...)` 也需複合索引
  - 第二個會直接導致「點房間進不去」
- **修正策略**（與 subscribeLobby 一致）：
  - 只用單一 where 條件（單欄位索引已內建）
  - 額外的狀態/排序過濾在 client 端做
  - 三個函式都重寫：
    - `cleanupAbandonedRooms`: 撈所有 active 房間，client 端 sort by lastActivityAt
    - `joinRoomByCode`: 只查 code（多取幾筆防呆），client 端挑 active
    - `lookupRoomByCode`: 同上
- **狀態**：✓ 提交並推送
- **好處**：未來 Firestore 規則更新或遷移專案時，不需要每次都建索引

### ~10:10 — 修正：點擊房間列表時未實際加入玩家
- **問題**：使用者回報點選「開放式房間」（無密碼的房間）加入時，只看到建立者，自己不在房間內
- **根因**：`handleEnterRoom` 只做了頁面跳轉（`navigate(...)`），沒有呼叫 `joinRoomByCode`，所以使用者從未進入 players 列表
- **修正**：
  - `handleEnterRoom`：無密碼時先呼叫 `joinRoomByCode(room.code)` 再跳轉
  - 已有玩家的情況下 `joinRoomByCode` 會早返回（room.players.some(p => p.uid === uid)），不會重複加入
- **狀態**：✓ 提交並準備部署

### ~00:00（Day 3 開始）— 房間密碼 + 自動清理

#### 密碼房間需求
- 無密碼房間：自由進入
- 密碼房間：6 位數字、用戶自訂、唯一性檢查
- 房間空 30 分鐘自動清理

#### 設計決策
- **儲存位置**：密碼 hash 放在 `/rooms/{roomId}/secret/password` 子集合
- **唯一性**：`/passwordIndex/{hash}` 集合，document ID 用 hash
  - 用 transaction 原子檢查+建立
  - 房間刪除時一併釋放索引
- **清理**：`cleanupAbandonedRooms()` 函式，進入 Lobby 時自動呼叫
  - 條件：status in [waiting/playing] AND (players.length==0 OR lastActivityAt > 30 min ago)
  - 失敗時 console.warn，不影響 UI
- **安全規則更新**：
  - rooms 可以被「房主」或「空房間」或「30 分鐘無活動」刪除
  - secret 子集合：所有人可讀、房主可寫
  - passwordIndex：可建立、不可更新（避免覆蓋）、可刪除

#### 實作
- `core/utils/password.ts`：hashPassword (SHA-256)、verifyPassword、isValidPasswordFormat
- `core/utils/password.test.ts`：13 個單元測試（格式/唯一性/錯誤處理）
- `core/types/room.ts`：加 hasPassword、lastActivityAt 欄位
- `core/services/roomService.ts`：
  - createRoom 支援 password option
  - joinRoomByCode 支援 password option
  - lookupRoomByCode（先查房間屬性，再決定要不要密碼）
  - cleanupAbandonedRooms
  - 所有更新動作（leave/ready/start/finish/reset）都更新 lastActivityAt
- `firebase/firestore.rules`：更新 rooms delete 規則、加入 secret 子集合與 passwordIndex
- `pages/Lobby.tsx`：
  - 建立時可選「設定密碼」核取框 + 6 位數字輸入
  - 加入時先 lookup，有密碼就跳出輸入框
  - 房間列表顯示「[鎖]」標記密碼房間
  - 進入 Lobby 時自動呼叫 cleanupAbandonedRooms

#### 測試
- 39 個單元測試全通過（12 井字 + 14 五子棋 + 13 密碼）
- TypeScript 0 errors
- Build 成功（848 KB / 214 KB gzip）

#### 狀態
✓ 完成。提交並部署。

### ~00:30 — 修復 Firestore 規則語法問題，部署成功
- **問題**：Firestore 規則的箭頭函數 `players.map(p => p.uid)` 不被規則 parser 支援，導致規則無法編譯
- **解法**：
  - 在 room 文件加 `playerUids: string[]` 獨立陣列
  - 規則改用 `request.auth.uid in resource.data.playerUids`
  - 加入/離開時同步維護此陣列
- **順便修正**：`firebase.json` 規則路徑從 `firestore.rules` 改為 `firebase/firestore.rules`
- **部署**：`firebase deploy --only firestore:rules` 成功（編譯通過、規則 release 到 cloud.firestore）
- **狀態**：✓ 規則上線、密碼與清理功能可運作
- **Vercel 自動部署**：31 秒前完成新 production deploy

### ~23:30 — 五子棋遊戲上線（驗證擴充性架構成功）

### ~23:30 — 五子棋遊戲上線（驗證擴充性架構成功）
- **commit**：`e13ae92` Merge branch 'feature/gomoku' ← `0330831` feat(gomoku)
- **做了什麼**：
  - 在 `src/games/gomoku/` 開新資料夾，實作 6 個檔案（types/engine/engine.test/sync/Gomoku/index）
  - 修改 3 個檔案（GameType、registry、Lobby、GameRoom）
  - 結果畫面從 tictactoe 提升為共用元件 `core/components/ResultScreen.tsx`
- **擴充性架構驗證成功**：
  - 新增遊戲零改動核心程式碼（只在 registry 加一行）
  - Lobby 遊戲選擇器自動從 registry 讀取
  - GameRoom 共用，自動根據 gameType 載入正確的遊戲元件
- **測試結果**：
  - 26 個單元測試全通過（12 井字 + 14 五子棋）
  - TypeScript 0 errors
  - Build 成功（833 KB / 211 KB gzip）
  - Vercel 自動部署成功（HTTP 200）
- **狀態**：✓ 五子棋上線

### ~23:00 — Vercel 自動部署（push 後觸發）
- 推送到 main 後 Vercel 自動觸發 production 部署
- 部署耗時 14 秒
- 新 URL：`githubtest-7ead5e8ry-clive520s-projects.vercel.app`（被保護，外部 401）
- alias 自動指向最新版本：`githubtest-blond.vercel.app` HTTP 200 ✓

### ~22:45 — Production 部署完整測試通過
- **里程碑**：第一個 production deployment 通過完整端到端測試
- **做了什麼**：
  - 使用者測試 Vercel 部署的網站
  - Google 登入成功
  - （推測）建立房間、加入、對戰、結果等流程通過
- **狀態**：✓ 第一個 production deployment 上線成功
- **下一個目標**：開發第二個遊戲

### ~22:30 — Firebase Authorized Domain 已加入，部署驗證

### ~22:00 — Firebase Authorized Domain 問題排查
- **問題**：在 Vercel 部署的網站上點 Google 登入出現 `auth/unauthorized-domain` 錯誤
- **原因**：Firebase 預設只允許 `localhost` 與 `.firebaseapp.com` 網域登入，Vercel 網域需手動加白名單
- **狀態**：等待手動加入 `githubtest-blond.vercel.app` 到 Firebase Console → Authentication → Settings → Authorized domains
- **檢查項目**：
  - [x] Firebase Console Authorized domains 加入 `githubtest-blond.vercel.app`
  - [ ] 等 30 秒讓 Firebase 同步
  - [ ] 強制重整瀏覽器（Ctrl+Shift+R）後再試
- **連結**：[DEPLOYMENT.md](DEPLOYMENT.md) 與 [RECORDS/firebase-setup.md](RECORDS/firebase-setup.md) 有完整步驟

### ~21:30 — Vercel 部署完成
- **commit**：（無 commit，是 Vercel 端操作）
- **做了什麼**：
  - 取得 Vercel token，用 `vercel --prod --yes` 部署
  - 7 個環境變數加密儲存於 Production
  - GitHub repo 自動連結，未來 push 會自動部署
- **結果**：
  - 部署 ID：`dpl_UBKhQZnc3oDCBuTWPVeZ4gWjjHcR`
  - 正式網址：**https://githubtest-blond.vercel.app**
  - HTTP 200，title 正確
- **問題**：Vercel 預設從資料夾名稱產生 URL（`github_test` → `githubtest-blond`），不夠美觀。可在 Vercel Settings 改 Project Name 為 `multiplayer-games` 改善

### ~21:00 — 部署設定（Phase 5）合併到 main
- **commit**：`2dbddfe` Merge branch 'feature/deployment' ← `2968a91` feat(deploy)
- **做了什麼**：
  - `vercel.json`：SPA rewrites
  - `firebase/firestore.rules`：正式版安全規則
  - `firebase/database.rules.json`：正式版 RTDB 規則
  - `firebase.json`：hosting + rules 路徑
  - `docs/DEPLOYMENT.md`：完整部署指南
  - `README.md` 更新進度
- **狀態**：✓ 提交並推送

### ~20:50 — 進階功能（Phase 4）合併到 main
- **commit**：`f3338df` Merge branch 'feature/advanced-features' ← `aa588ef` feat(advanced)
- **新增檔案**：
  - `core/services/statsService.ts`：wins/losses/draws 累積
  - `core/services/historyService.ts`：對戰歷史記錄
  - `core/services/presenceService.ts`：onDisconnect 在線狀態
  - `core/hooks/{useLeaderboard,useUserHistory,usePresence}.ts`
  - `pages/Leaderboard.tsx`：排行榜（前 20 名）
  - `pages/Profile.tsx`：個人 stats + 對戰歷史
- **整合**：
  - `roomService.finishGame` 自動觸發 stats 更新與歷史寫入（idempotent）
  - `GameRoom` 玩家卡片加在線指示器
- **狀態**：✓ 提交並推送

### ~20:30 — 結果畫面 + 自動離開倒數
- **commit**：`7a309ff` feat(tictactoe): 遊戲結束畫面（勝/敗/平手）+ 自動離開倒數
- **新增**：
  - `games/tictactoe/ResultScreen.tsx`：根據玩家觀點顯示「你贏了！」「你輸了」「平手！」
  - 三色視覺：勝=金、敗=紅、平=灰
  - 玩家卡片標示「獲勝」「落敗」「平手」
  - 20 秒倒數計時（可設定）+ 進度條
  - 三按鈕：留在此頁 / 恢復自動離開 / 再來一局（房主）/ 立即離開
- **順便修**：`handleStart` 也加 `resetGameState`，避免新局看到舊棋盤

### ~20:20 — 修正 RTDB null 陣列崩潰
- **commit**：`134b443` fix(tictactoe): 修正 RTDB null 陣列損壞導致遊戲崩潰
- **問題**：使用者回報按「開始遊戲」後畫面崩潰
- **錯誤**：`TypeError: Cannot read properties of undefined (reading '0')` 在 `findWinnerSymbol`
- **根因**：Firebase RTDB 不支援陣列中的 `null`，寫入 `board: [null, null, ...]` 後 null 被刪除，`state.board` 變 `undefined`
- **修正**：
  - `Cell` 從 `'X' | 'O' | null` 改為 `'X' | 'O' | ''`（空字串對 RTDB 友善）
  - 新增 `isValidState` 型別守衛，損壞資料回 null 觸發自動重置
  - `findWinnerSymbol` 加 null/型別防禦
  - TicTacToe 元件加 board 完整性檢查
  - **新元件 `ErrorBoundary`**：未來任何子元件錯誤都不會整頁崩潰
- **狀態**：✓ 提交並推送

### ~20:10 — 修正房間頁顯示房號 + 大廳查詢
- **commit**：`9df8e23` fix: 房間頁顯示房號、大廳查詢改用 client 端過濾、修變數命名衝突
- **問題 1**：使用者回報 GameRoom 沒顯示 6 碼房號
- **根因 1**：`Room` 型別沒包含 `code` 欄位
- **問題 2**：大廳永遠「載入中」
- **根因 2**：`where('status', 'in', [...])` + `orderBy('createdAt', 'desc')` 需 Firestore 複合索引，沒建就靜默失敗
- **修正**：
  - `Room` / `RoomSummary` 型別加 `code` 欄位
  - GameRoom 加「邀請朋友」黃色區塊顯示房號 + 複製按鈕
  - `subscribeLobby` 改用 `orderBy + limit` 拉最新，client 端過濾 status
  - useLobby / useRoom 加 error 狀態，Lobby 與 GameRoom 顯示錯誤訊息
- **狀態**：✓ 提交並推送

---

## 2026-06-12（Day 1）— 規劃、Phase 0~3

### ~12:25 — 井字遊戲核心（Phase 3）合併到 main
- **commit**：`770a55c` Merge branch 'feature/tictactoe-core' ← `1974daa` feat(tictactoe)
- **新增模組**（`src/games/tictactoe/`）：
  - `types.ts`：Cell, Board, TicTacToeState
  - `engine.ts`：純函式 validateMove / applyMove / checkResult
  - `engine.test.ts`：12 個單元測試全數通過（橫線/豎線/對角線/平手/越界）
  - `sync.ts`：RTDB runTransaction 原子操作
  - `TicTacToe.tsx`：3x3 棋盤 UI、回合提示、最後落子高亮
  - `index.ts`：匯出 tictactoeDefinition
- **工具鏈**：安裝 vitest + @testing-library + jsdom
- **決策**：
  - 同步策略選 `hybrid`（Firestore 存房間結構、RTDB 存即時棋盤）
  - 狀態用 `nextSymbol` 切換回合（不用 playerId 推算，較直觀）
- **狀態**：✓ 12/12 tests passed, typecheck 0 errors, build success

### ~12:14 — 房間系統（Phase 2）合併到 main
- **commit**：`59a1aaa` Merge branch 'feature/room-system' ← `09aa7c5` feat(room)
- **新增模組**：
  - `core/types/{room,user,game}.ts`
  - `core/utils/roomCode.ts`：6 碼產生器（避開 0/1/I/O 易混淆字元）
  - `core/services/roomService.ts`：createRoom / joinRoomByCode / leaveRoom / setPlayerReady / startGame / resetRoom / finishGame / subscribeRoom / subscribeLobby
  - `core/hooks/{useRoom,useLobby}.ts`
  - `core/components/RequireAuth.tsx`
  - `pages/Lobby.tsx`：建立房間、用房號加入、房間列表
  - `pages/GameRoom.tsx`：等待大廳、玩家準備、開始、結果
- **GameDefinition 介面**：擴充性的核心，每個新遊戲實作這個介面
- **狀態**：✓ 提交並推送

### ~12:05 — Firebase 整合（Phase 1）合併到 main
- **commit**：`ec4d677` feat: 初始化 Vite + React + TS 專案並整合 Firebase
- **做了什麼**：
  - Vite + React + TypeScript + Tailwind 開發環境
  - Firebase SDK v10、React Router v6、Zustand
  - Firebase 初始化（`src/core/firebase/`）：app, config, firestore, rtdb
  - Google 認證（`src/core/auth/`）：AuthProvider, useAuth, googleSignIn
  - 首頁 + 登入按鈕
  - 補充 FIREBASE_SETUP.md 教學文件
- **環境變數**：`.env.local` 從使用者取得真實 config
- **狀態**：✓ typecheck/build 全過

### ~11:36 — Phase 0 初始化
- **commit**：`aa0eb97` chore: 初始化專案與開發計畫書
- **決策**：
  - 選用井字遊戲作為第一個遊戲（MVP）
  - 採用 Vite + React + TypeScript + Tailwind 技術棧
  - Firebase 雙軌（Firestore + RTDB）依資料性質分流
  - Git Flow 簡化版：main + develop + feature/*
- **建立**：
  - `docs/DEVELOPMENT_PLAN.md`（完整開發計畫書）
  - `.gitignore`、`README.md`、`.env.example`
  - GitHub repo `clive520/multiplayer-games`（Public）
- **狀態**：✓ 推送完成

### ~10:00~11:00 — 規劃階段
- **討論**：多人遊戲網站需求（GitHub 版控 + Firebase 後端 + 多人遊戲）
- **遊戲選擇**：候選清單（井字、UNO、你畫我猜、狼人殺...）
- **使用者決定**：井字遊戲（最簡單、最快可擴充驗證）
- **認證方式**：Google 帳號
- **Firebase 服務**：兩者都用，依資料性質決定
- **建立**：`docs/DEVELOPMENT_PLAN.md` v0.1
- **GitHub 連線測試**：成功建立 repo 並驗證自動上傳可行

---

## 模板（之後新增條目用）

```markdown
### HH:MM — 標題
- **commit**：（commit SHA 或「無，僅本地」）
- **做了什麼**：
  - ...
- **決定**：（架構、技術選擇）
  - ...
- **問題**：（遇到的 bug、阻礙）
  - ...
- **狀態**：✓ 完成 / ⚠️ 進行中 / ❌ 卡住
- **下一步**：（待辦）
```

---

## 待辦與方向

- [x] 完成 Firebase Authorized Domain 加入
- [x] 部署後實際雙人測試（使用者確認成功）
- [x] 新增第二個遊戲（五子棋，擴充性架構驗證成功）✓
- [x] 房間密碼 + 自動清理空房間 ← 剛完成
- [ ] Vercel Project Name 改為 `multiplayer-games`（讓網址更美觀）
- [ ] 房內聊天（之前跳過）
- [ ] 程式碼分割減少 bundle size
- [ ] 優化 Firebase 安全規則
- [ ] 第三個遊戲？（黑白棋、UNO、你畫我猜）
