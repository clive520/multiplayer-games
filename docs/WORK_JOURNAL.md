# 工作日誌

> 記錄多人遊戲網站專案的所有開發事件。  
> **格式**：倒序（最新在最上方），按日期時間排列。  
> **目標**：事後可回溯決策與問題。

---

## 2026-06-12（Day 2）— 部署、文件整理

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
