# 改進項目追蹤

> 多人遊戲網站的待改進項目 + 進度追蹤。  
> 每一項有：編號、標題、要做什麼、為什麼值得做、目前狀態、完成時的簡短紀錄。  
> 結構弄好之後再開發第四個遊戲。

---

## 進度總覽

- **總項目**：26
- **✅ 已完成**：4
- **⏳ 進行中**：0
- **⬜ 待辦**：22
- **已完成優先項目**：1, 2, 3, 4
- **剩餘優先項目**：5, 6, 7, 8, 9, 10

---

## 優先處理（1–10）

---

### 1. 程式碼分割（Lazy loading）— ✅ 已完成

**類別**：結構面

**要做什麼**：
- 把每個遊戲的 `index.ts` 改成動態載入
- `GameDefinition` 加 `loadComponent: () => Promise<ComponentType<...>>`
- GameRoom 改用 React.lazy + Suspense 載入遊戲元件

**為什麼值得做**：
- 現況 build 出來約 870kB，加第四個遊戲會更大
- Lobby 首屏不必載所有遊戲邏輯
- 新遊戲增量更小、易擴展

**完成紀錄**：
- 2026-06-12 ✅
  - `core/types/game.ts`：`GameDefinition.component` 改為 `loadComponent: () => Promise<...>`
  - 三個遊戲 `index.ts`：`loadComponent: () => import('./Xxx').then(m => m.default)`
  - 移除不再被引用的 `TicTacToe/Gomoku/Reversi` re-exports
  - `pages/GameRoom.tsx`：用 useState + useEffect 動態載入，加載入中 fallback
  - **build 結果**：遊戲程式碼拆成 3 個獨立 chunk（TicTacToe 4.3kB / Gomoku 4.0kB / Reversi 5.5kB）+ 共享元件 TurnCountdown 0.5kB；main chunk 略縮至 867kB
  - 66 測試通過、typecheck ✓
  - 後續可考慮：進一步把 Firebase SDK、UI 庫等也拆 chunk（這次沒動因為影響太大）

---

### 2. 抽出共用的「棋盤 / 玩家資訊 / 操作列」元件 — ✅ 已完成

**類別**：結構面

**要做什麼**：
- 抽出 `<GameHeader>`（標題 + 倒數 + 玩家徽章）
- 抽出 `<GameInfoBar>`（X 數 vs O 數）
- 抽出 `<BoardCell>` 共用元件（處理 disabled、hover、選填的動畫）
- 三個遊戲只負責棋盤邏輯和遊戲規則

**為什麼值得做**：
- 三個遊戲元件樣式重複度高
- 加新遊戲時樣式一致、改 UI 不必三個地方一起改

**完成紀錄**：
- 2026-06-12 ✅
  - 新增 3 個共用元件：
    - `core/components/GameHeader.tsx`：統一 header 版面，接收 `GameHeaderStatus` discriminated union 自動切換訊息、整合 TurnCountdown、支援玩家徽章和右側額外內容（reversi 用）
    - `core/components/PlayerBadge.tsx`：統一的「(符號): 暱稱」小徽章，自動套用 formatSymbol
    - `core/components/BoardCell.tsx`：棋盤格按鈕，memo 化、固定處理 onClick/onMouseEnter/onMouseLeave/disabled/最後落子紅點；視覺樣式透過 className 由各遊戲自訂
  - 三個遊戲元件（TicTacToe / Gomoku / Reversi）全部改用上述元件
  - 每個遊戲不再重複 header JSX 和 button JSX
  - 修了一個 type 問題：`isLastMove` 從 `state.lastMove && ...` 改成 `!!(...)` 確保 boolean
  - **Bundle 變化**（驗證）：
    - TicTacToe 4.33kB → 3.58kB
    - Gomoku 4.06kB → 3.35kB
    - Reversi 5.46kB → 5.05kB
    - BoardCell 2.47kB（自動 split，3 個遊戲共用）
    - main 略縮 0.03kB
  - 68 測試通過、typecheck ✓
  - **為 #5 移動動畫鋪路**：BoardCell 已內建 `transition`，遊戲只要在 className 加 `animate-fade-in` 即可

---

### 3. GameDefinition 結構擴充 — ✅ 已完成

**類別**：結構面

**要做什麼**：
- 補上 `tutorialSteps?: string[]`（教學步驟）
- 補上 `variants?: { id, name, config }[]`（變體列表）
- 補上 `estimatedDuration?: number`（預估一局時間）
- `description` 已有但目前沒用到 → 接到 Lobby / GameRoom 顯示

**為什麼值得做**：
- 為 #14「房間設定擴充」鋪路
- 新遊戲的 metadata 一次到位，不必日後回頭補

**完成紀錄**：
- 2026-06-12 ✅
  - `core/types/game.ts`：新增 `tutorialSteps?: string[]`、`estimatedDurationMin?: number`、`variants?: GameVariant[]` 三個可選欄位
  - 新增 `GameVariant` 介面（id, name, description, config?）
  - 三個遊戲都填入：
    - tictactoe：3 步驟、3 分鐘
    - gomoku：4 步驟、15 分鐘
    - reversi：5 步驟、10 分鐘
  - `pages/Lobby.tsx` 房間卡片加：
    - 「預計 X 分鐘」標籤
    - 遊戲 description 單行 line-clamp 顯示
  - 新增 4 個 GameDefinition metadata 測試（確保必要欄位、型別正確）
  - **為 #14 房間設定擴充和「怎麼玩」對話框鋪路**：metadata 已就緒
  - 72 測試通過（原 68 + 新增 4）、typecheck ✓、build ✓

---

### 4. 統一錯誤處理 / Toast 通知 — ✅ 已完成

**類別**：結構面

**要做什麼**：
- 建立 `<Toast>` 元件 + `useToast()` hook
- 統一 success / error / info / warning 四種樣式
- 把散落的 `alert()`、紅色區塊錯誤都改用 toast

**為什麼值得做**：
- 提升整體 UX 品質
- 錯誤不擋視線、不打斷流程
- 為未來更多功能（網路斷線、權限錯誤）提供一致的回饋

**完成紀錄**：
- 2026-06-12 ✅
  - 新增 `core/components/Toast.tsx`：
    - `ToastProvider` context 包在 main.tsx 的 AuthProvider 內
    - `useToast()` hook 提供 `show()` / `success()` / `error()` / `info()` / `warning()` 五個方法
    - 自動 4 秒消失（可自訂 duration，傳 0 表示不自動消失）
    - 右上角浮動 stack、可手動關閉
    - 樣式：四種顏色 + 圖示（✓ ✕ ℹ ⚠）+ 背景模糊
    - 鍵盤 / 螢幕閱讀器友好（aria-live, role, aria-label）
  - 替換 `pages/Home.tsx` 的 `alert('登入失敗，請稍後再試')` 為 `toast.error(...)`
  - 新增 1 個測試：驗證預設 duration 常數
  - 既有 inline 紅色區塊錯誤（GameRoom、Lobby、遊戲元件）保留：那些是 contextual 的 UI，不適合用 toast（會被快速消失）
  - 73 測試通過（原 72 + 新增 1）、typecheck ✓、build ✓
  - **為未來鋪路**：所有新功能（網路錯誤、權限錯誤等）都該用 toast

---

### 5. 移動動畫 — ⬜ 待辦

**類別**：觀戰體驗

**要做什麼**：
- 新棋子 fade-in 200ms
- 最後落子 ring 閃光
- Reversi 翻棋時翻轉動畫
- 五子棋/井字最後落子用 ring 高亮

**為什麼值得做**：
- 觀戰者一眼能看出「哪一手剛下」
- 提升遊戲感
- 工程量小（純 CSS 動畫）

**完成紀錄**：
- ⬜

---

### 6. 棋譜 / 移動歷史面板 — ⬜ 待辦

**類別**：觀戰體驗

**要做什麼**：
- GameRoom 加側欄列出所有步驟：玩家名、座標、時間戳
- 可收合（手機友善）
- 點任一步可靜態查看（replay 雛形）
- 棋譜自動存到 `gameHistory/{id}.moves[]`（已有 history 集合，再加欄位）

**為什麼值得做**：
- 觀戰者回顧剛才發生了什麼
- 理解戰術、學習
- 之後做 #22「棋譜分享」基礎

**完成紀錄**：
- ⬜

---

### 7. 大廳 hover 預覽房間 — ⬜ 待辦

**類別**：觀戰體驗

**要做什麼**：
- Lobby 房間列表 hover 顯示浮動卡片
- 卡片內容：目前棋盤縮圖、最後一手、玩家大頭貼、觀戰人數、思考時間設定

**為什麼值得做**：
- 進房前先判斷是否值得進場
- 工程量小（hover 卡片 + 訂閱 game state）
- 觀戰者能快速找到有趣的對局

**完成紀錄**：
- ⬜

---

### 8. 房間結束的觀戰體驗 — ⬜ 待辦

**類別**：觀戰體驗

**要做什麼**：
- 觀戰者不被自動 20 秒踢出
- 加「離開」/「留下看結果」按鈕
- 加「再看一次棋譜」按鈕（用 #6 棋譜資料）
- 加簡單的祝賀 / 鼓勵反應

**為什麼值得做**：
- 觀戰者願意看完結果（目前 20 秒就被踢）
- 提升觀戰完成率

**完成紀錄**：
- ⬜

---

### 9. AI 對手（單人模式）— ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- 每個遊戲的 engine 旁加 AI 模組（井字：Minimax、五子棋：pattern matching、黑白棋：greedy + alpha-beta）
- GameDefinition 加 `aiEngine?: { selectMove: (...) => Move | null }`
- Lobby 加「單人 vs AI」入口

**為什麼值得做**：
- 玩家不用湊人數也能玩
- 驗證 engine 邏輯的好方法
- 每個 AI 約 200~500 行，三個遊戲加起來工作量中等

**完成紀錄**：
- ⬜

---

### 10. ELO 評分 — ⬜ 待辦

**類別**：社群 / 進階功能

**要做什麼**：
- 每局結束依 ELO 公式更新 `users/{uid}.elo`
- 預設起始評分 1200
- K-factor 隨場次遞減（新手 K=40、老手 K=16）
- Profile 顯示評分 + 等級名稱（青銅/白銀/黃金/白金/鑽石）
- Leaderboard 排序依評分（仍可切換勝場排序）

**為什麼值得做**：
- 高手 vs 新手配對更公平
- 開始累積有意義的對戰資料
- 為將來「ranked 模式」鋪路

**完成紀錄**：
- ⬜

---

## 結構面（11–15 之外的其餘）

---

### 5a. 國際化（i18n）— ⬜ 待辦

**類別**：結構面

**要做什麼**：
- 用 `react-i18next` 抽出所有中文字串
- 建立 `locales/zh-TW.json` 和 `locales/en-US.json`
- 加語言切換器（在 Settings 或 header）

**為什麼值得做**：
- 之後支援英文版不痛
- 建議在加第四個遊戲前先做，否則改字串會很散

**完成紀錄**：
- ⬜

---

## 觀戰體驗（其餘）

---

### 10a. 觀戰者反應 / 快速訊息 — ⬜ 待辦

**類別**：觀戰體驗

**要做什麼**：
- GameRoom 加一排小按鈕（👏 加油 / 😱 驚訝 / 👍 佩服）
- 點擊時畫面浮動氣泡、3 秒淡出
- 不影響遊戲本體（純視覺效果）

**為什麼值得做**：
- 觀戰有參與感
- 不打斷遊戲

**完成紀錄**：
- ⬜

---

## 玩家體驗（其餘）

---

### 12. 悔棋 / 復盤請求 — ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- 當前玩家按「請求悔棋」→ 對方彈出確認視窗
- 確認後：RTDB game state 回到上一步
- Firestore 規則防止單方強制悔棋

**為什麼值得做**：
- 不小心下錯的救濟
- 朋友間玩更輕鬆

**完成紀錄**：
- ⬜

---

### 13. 暫停 / 暫離 — ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- 房主可按「暫停」（每局限 2 次、每次最多 5 分鐘）
- 倒數凍結、turnStartedAt 也暫停
- 對玩家 / 觀戰者顯示「已暫停」狀態

**為什麼值得做**：
- 玩家臨時離開不會被誤判 forfeit
- 提升社交友善度

**完成紀錄**：
- ⬜

---

### 14. 房間設定擴充 — ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- `GameDefinition.setupSchema` 動態產生設定表單
- 五子棋：棋盤大小、禁手規則
- 黑白棋：先手選擇
- 通用：是否允許觀戰、是否公開棋譜

**為什麼值得做**：
- 每個遊戲可深度客製
- 為進階玩家提供更多選擇

**完成紀錄**：
- ⬜

---

### 15. 成就 / 徽章 — ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- 成就列表：首勝、10 連勝、逆轉勝、完美對局、50 勝、...
- 玩家解鎖時顯示成就動畫
- Profile 加徽章牆

**為什麼值得做**：
- 增加遊戲動機
- 提升黏著度

**完成紀錄**：
- ⬜

---

### 16. 音效 — ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- 落子聲、勝利音效、倒數滴答聲
- 預設關閉，Settings 切換

**為什麼值得做**：
- 增加遊戲沉浸感
- 工程量小（幾個音檔 + 設定）

**完成紀錄**：
- ⬜

---

### 17. 設定頁 — ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- `/settings` 路由
- 音效開關、語言、主題、隱私設定

**為什麼值得做**：
- 集中管理用戶偏好
- 為 #16 #18 提供 UI 入口

**完成紀錄**：
- ⬜

---

### 18. 主題（淺色模式）— ⬜ 待辦

**類別**：玩家體驗

**要做什麼**：
- Tailwind `darkMode: 'class'`
- 加切換器在 Settings
- localStorage 儲存偏好

**為什麼值得做**：
- 白天/晚上使用體驗差很多
- 擴展設計自由度

**完成紀錄**：
- ⬜

---

## 社群 / 進階功能（其餘）

---

### 19. 好友系統 — ⬜ 待辦

**類別**：社群

**要做什麼**：
- `users/{uid}/friends` 子集合 + `friendRequests` 集合
- 線上狀態從 RTDB 讀
- Profile 加「加好友」、Lobby 篩選「好友的房間」

**為什麼值得做**：
- 提升社交黏性
- 找朋友一起玩的體驗

**完成紀錄**：
- ⬜

---

### 20. 聊天（房間內）— ⬜ 待辦

**類別**：社群

**要做什麼**：
- 房間內 RTDB `chat/{msgId}` 文字 + 預設表情
- 長度限制、可加「靜音」功能
- 防濫用關鍵字過濾

**為什麼值得做**：
- 玩家 / 觀戰者目前完全無法溝通
- 提升互動性

**完成紀錄**：
- ⬜

---

### 21. 錦標賽（bracket）— ⬜ 待辦

**類別**：社群

**要做什麼**：
- `tournaments` collection（4 / 8 / 16 人）
- 自動配對、勝者晉級
- 錦標賽頁面顯示 bracket 進度

**為什麼值得做**：
- 一次性活動增加熱度
- 培養競爭社群

**完成紀錄**：
- ⬜

---

### 22. 棋譜分享 / 公開 — ⬜ 待辦

**類別**：社群

**要做什麼**：
- 歷史列表加「分享」按鈕
- 產生公開 URL（任何人都能看完整棋譜重播）
- 用 #6 棋譜資料實作

**為什麼值得做**：
- 讓精彩對局被分享傳播
- 吸引新玩家

**完成紀錄**：
- ⬜

---

### 24. 每日 / 每週挑戰 — ⬜ 待辦

**類別**：社群

**要做什麼**：
- 每天推一題殘局
- 玩家下出最佳解，完成得徽章或經驗值
- AI 評分（每步差距加總）

**為什麼值得做**：
- 老玩家有事做
- 練習效果

**完成紀錄**：
- ⬜

---

### 25. 觀戰預測 — ⬜ 待辦

**類別**：社群

**要做什麼**：
- 房間內「預測誰會贏」按鈕
- 預測正確 +10 分（每局限一次）
- 累積資料可供未來 ML 用

**為什麼值得做**：
- 觀戰有目的性
- 增加互動

**完成紀錄**：
- ⬜

---

### 26. 反饋 / 檢舉 — ⬜ 待辦

**類別**：社群

**要做什麼**：
- 玩家頭像 / 房間 / 訊息加「檢舉」按鈕
- 送到 `reports` 集合
- 之後可加管理員審核頁

**為什麼值得做**：
- 長期社群健康必備
- 預防性嚇阻

**完成紀錄**：
- ⬜

---

## 變更紀錄

| 日期 | 變更 |
|------|------|
| 2026-06-12 | 初版建立，列出 26 項改進建議 |
| 2026-06-12 | ✅ #1 程式碼分割完成：3 個遊戲拆成獨立 chunk，main 略縮 |
| 2026-06-12 | ✅ #2 抽出共用元件完成：GameHeader / PlayerBadge / BoardCell，3 個遊戲都改用 |
| 2026-06-12 | ✅ #3 GameDefinition 擴充：tutorialSteps / estimatedDurationMin / variants，3 個遊戲都填入 metadata，Lobby 顯示 description 和預計時間 |
| 2026-06-12 | ✅ #4 Toast 通知系統：4 種樣式 + useToast hook，替換首個 alert |
