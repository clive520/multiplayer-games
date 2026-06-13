# 工作日誌

> 記錄多人遊戲網站專案的所有開發事件。  
> **格式**：倒序（最新在最上方），按日期時間排列。  
> **目標**：事後可回溯決策與問題。

---

## 2026-06-12（Day 2）— 部署、文件整理

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
- [ ] Vercel Project Name 改為 `multiplayer-games`（讓網址更美觀）
- [ ] 房內聊天（之前跳過）
- [ ] 程式碼分割減少 bundle size
- [ ] 優化 Firebase 安全規則
- [ ] 第三個遊戲？（黑白棋、UNO、你畫我猜）
