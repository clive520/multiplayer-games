# 標準作業流程（SOP）

> 多人遊戲網站專案的標準作業流程。  
> 涵蓋：日常工作日誌格式、開發流程、部署流程、除錯 SOP。

---

## 目錄

1. [每日工作日誌 SOP](#1-每日工作日誌-sop)
2. [開發流程 SOP](#2-開發流程-sop)
3. [部署流程 SOP](#3-部署流程-sop)
4. [測試 SOP](#4-測試-sop)
5. [Bug 處理 SOP](#5-bug-處理-sop)
6. [Commit 規範 SOP](#6commit-規範-sop)

---

## 1. 每日工作日誌 SOP

### 1.1 寫入位置
`docs/WORK_JOURNAL.md`（單一檔案，永久累積）

### 1.2 排序規則
**倒序**（最新在最上面）。新增條目時插到該日期區段的頂部。

### 1.3 條目格式
```markdown
### HH:MM — 簡短標題
- **commit**：（commit SHA 或「無，僅本地」）
- **做了什麼**：
  - 重點 1
  - 重點 2
- **決定**：（架構、技術選擇）
  - 為什麼選 A 不選 B
- **問題**：（遇到的 bug、阻礙）
  - 錯誤訊息、堆疊
  - 嘗試過的解法
- **狀態**：✓ 完成 / ⚠️ 進行中 / ❌ 卡住
- **下一步**：（待辦）
```

### 1.4 範例
```markdown
### 14:30 — 修正 RTDB null 陣列崩潰
- **commit**：`134b443`
- **問題**：使用者回報按「開始遊戲」後 `TypeError: Cannot read properties of undefined`
- **根因**：Firebase RTDB 不支援陣列中的 null
- **修正**：Cell 型別從 `null` 改為 `''`
- **狀態**：✓ 完成
```

### 1.5 寫入時機
- 完成一個功能或重大 commit 後
- 解決 bug 後
- 做出架構決策時
- 部署完成時
- 任何「事後值得回想」的事件

---

## 2. 開發流程 SOP

### 2.1 開始新功能
```bash
# 1. 確認 main 是最新
git checkout main
git pull origin main

# 2. 建立 feature branch
git checkout -b feature/<name>

# 3. 開發...

# 4. 確認通過檢查
npm run typecheck    # 0 errors
npm test             # all tests pass
npm run build        # success
```

### 2.2 提交並推送
```bash
git add .
git status   # 確認 .env.local 等敏感檔沒被加入
git commit -m "feat: 簡短描述"   # 見 commit 規範
git push -u origin feature/<name>
```

### 2.3 合併到 main
**方式 A：透過 PR（推薦）**
- 在 GitHub 開 PR
- 自我 Review
- 合併
- Vercel 自動部署

**方式 B：本地合併（小型修正）**
```bash
git checkout main
git merge feature/<name> --no-ff -m "Merge branch 'feature/<name>'"
git push origin main
git branch -d feature/<name>
```

### 2.4 Hotfix（緊急修 bug）
- 可直接 commit 到 main（不開 branch）
- commit 訊息用 `fix:` 開頭
- 推送後 Vercel 自動部署

---

## 3. 部署流程 SOP

### 3.1 環境變數管理
- **本機**：`.env.local`（不入版控）
- **Vercel**：Dashboard 或 `vercel env add` 設定（加密）
- **更新後**：要重新部署才生效（Vite build-time 內嵌）

### 3.2 第一次部署（新環境）
```bash
# 1. 確認所有環境變數都已設定
vercel env ls

# 2. 部署到 production
vercel --prod --yes

# 3. 記下 URL，到 Firebase 加 Authorized Domain
```

### 3.3 日常部署（push 即部署）
```bash
# 1. 合併 PR 或 commit 到 main
git push origin main

# 2. Vercel 自動觸發部署
# 3. 到 https://vercel.com/clive520s-projects/github_test 看狀態
```

> ⚠️ **常見陷阱**：`git commit` 只在本機，**必須** `git push origin main` 才會觸發 Vercel 部署。  
> 如果使用者反映「網站沒更新」，先確認 `git log origin/main` 是否有最新的 commit。  
> 確認方式：到 Vercel Dashboard 對照「最新部署的 commit SHA」是否等於本機 `git rev-parse HEAD`。  
> 備用解法：若 webhook 沒觸發，用 Vercel API 手動建立 deployment（POST `/v13/deployments`，body 帶 `gitSource` 指向 main branch）。

> ⚠️ **更嚴重的陷阱**：Vercel **只會自動部署前端程式碼**，Firebase 規則（Firestore + RTDB）**不會自動部署**！  
> 改了 `firebase/firestore.rules` 或 `firebase/database.rules.json` 之後，**必須手動跑**：
> ```bash
> firebase deploy --only firestore:rules,database
> ```
> 否則前端會出現 `PERMISSION_DENIED` 錯誤（本地測試看不到，因為 emulator 沒開）。  
> 症狀：Console 一直噴 `FIREBASE WARNING: ... failed: permission_denied`。  
> 預防：每次改 rules 檔，先 `firebase deploy` 再 `git push`，或 commit message 寫 `[skip-vercel]` 提醒自己。  
> 已發生在 2026-06-15 #20 聊天上線時。

> ⚠️ **更更嚴重的陷阱（靜默版）**：Firestore rules 的 `rooms/{roomId}` update 規則用 `affectedKeys().hasOnly([...])` 白名單限制可寫入的欄位。**新增 Room 欄位時必須同步加到白名單**！
> - 症狀：前端看起來正常，但功能失效（額度沒生效 / 狀態沒更新）。Console 沒錯誤（Firebase SDK 預設吞掉 permission denied 警告）。
> - 例：#12 悔棋功能 `undoUsedByUids` 沒在白名單 → `incrementUndoQuota` 寫入被默默擋掉 → 悔棋限額失效 → 可以一直悔棋。
> - 預防：見下方「改資料結構 Checklist」。

### 3.3.1 改資料結構 Checklist（必查）

**情境 A：新增 / 改 Room 結構（Firestore `rooms/{roomId}` doc 的欄位）**
- [ ] `src/core/types/room.ts`：加欄位到 `Room` interface
- [ ] `src/core/services/roomService.ts`：`roomFromDoc` 解析新欄位（給 `?? {}` 預設值，避免舊 doc 讀不到）
- [ ] **`firebase/firestore.rules`**：在 `rooms/{roomId}` update 規則的 `hasOnly([...])` 白名單加新欄位名
- [ ] 部署：`firebase deploy --only firestore:rules`
- [ ] 任何 `updateDoc(ref, { ... })` 呼叫的 `affectedKeys` 都要在白名單內
- [ ] 跨用戶寫入的欄位（如 `users/{uid}` 的 `overall` / `byGame`）也要在 `users/{uid}` update 規則的白名單內

**情境 B：新增 / 改 RTDB 結構（`rooms-live/{roomId}/state` / `chat` / `reactions` / 新節點）**
- [ ] 程式碼：寫入新節點
- [ ] **`firebase/database.rules.json`**：在對應路徑加 `.read` / `.write` 規則
- [ ] 必要時加 `.validate` 限制必填欄位
- [ ] 部署：`firebase deploy --only database`
- [ ] **不要假設 emulator 行為等同 production**（emulator 沒開時，本地測試不會擋 PERMISSION_DENIED）

**情境 C：新增 / 改 useEffect、useState、useCallback**
- [ ] 所有 React hooks 必須在 **early return 之前**（rules of hooks）
- [ ] 違反 → React error #310「Rendered more hooks than during the previous render」
- [ ] 參考 #12 悔棋 Phase A 的 bug：把 useEffect 放在 `if (loading) return` 之後，第一次 render 走 early return、第二次走完整邏輯 → hook 數量變化

**驗證 SOP**：每次 commit 前
```bash
# 三項都通過
npm run typecheck
npm test
npm run build
```

然後：
```bash
git push origin main
# Vercel 自動部署前端

# 若是改了 firebase/*.rules
firebase deploy --only firestore:rules,database
```



### 3.4 部署後驗證清單
- [ ] 網站可開啟（HTTP 200）
- [ ] Google 登入按鈕可運作（已加 Authorized Domain）
- [ ] 建立/加入房間正常
- [ ] 雙人對戰即時同步
- [ ] 排行榜與個人檔案正常
- [ ] Console 無 JS 錯誤

### 3.5 Rollback
Vercel → Deployments → 找到上一個好的 deployment → 「Promote to Production」

### 3.6 部署前檢查
```bash
npm run typecheck && npm test && npm run build
# 三項都通過才能部署
```

---

## 4. 測試 SOP

### 4.1 測試類型
| 類型 | 工具 | 對象 |
|------|------|------|
| 單元測試 | vitest | 純函式（遊戲引擎、工具）|
| 整合測試 | （待加入）| 服務層互動 |
| E2E 測試 | （待加入）| 完整流程 |

### 4.2 跑測試
```bash
npm test            # 跑一次
npm run test:watch  # watch 模式
```

### 4.3 寫新測試
- 檔名：`*.test.ts` 或 `*.test.tsx`
- 位置：與被測檔案同目錄
- 工具：`describe`、`it`、`expect` from `vitest`

### 4.4 測試原則
- 純函式優先測試
- 引擎邏輯必測（勝負判定、移動驗證）
- Service 層次要（用 mock）
- React 元件可用 Testing Library（目前未啟用）

---

## 5. Bug 處理 SOP

### 5.1 重現問題
1. **取得錯誤訊息**（瀏覽器 console / 終端機）
2. **記錄發生步驟**（按了什麼按鈕、用了什麼資料）
3. **截圖**（UI 相關）

### 5.2 定位問題
| 症狀 | 可能原因 | 檢查位置 |
|------|---------|---------|
| 頁面空白 | JS 錯誤 | Browser Console |
| 登入失敗 | Authorized Domain | Firebase Console |
| 查詢「載入中」永遠 | 複合索引 / 規則 | Firebase Console Indexes & Rules |
| `The query requires an index` | 跨欄位 where+where 或 where+orderBy 需複合索引 | 改用 client 端過濾（見下方教學）|
| 資料看不到 | 規則阻擋 | Firebase Console Rules 模擬器 |
| RTDB 同步延遲 | 網路 / 規則 | RTDB Console Rules |
| 即時同步失敗 | RTDB null 問題 | 檢查陣列是否含 null |

### 5.5 避免 Firestore 複合索引的設計原則
- **能單一 where 就單一 where**：單欄位索引是內建的，無需手動建
- **跨欄位過濾改在 client 端**：撈「可能命中」的所有文件，client 端再 filter/sort
- **範例**：
  ```typescript
  // ❌ 避免：where + where + orderBy
  query(collection, 
    where('status', 'in', ['a', 'b']),
    orderBy('createdAt', 'desc'),
    limit(20),
  )
  
  // ✓ 改：單一 where + client 端過濾
  query(collection, 
    orderBy('createdAt', 'desc'),
    limit(60),  // 多取一些
  )
  // 然後 client 端 filter status
  ```
- **時機**：小型應用（< 1000 文件）一律用 client 端過濾；大型應用才考慮建索引

### 5.3 修復流程
1. **分支**：`fix/<bug-name>` 或直接在 main（hotfix）
2. **加防禦檢查**（避免類似 bug 重現）
3. **重現 → 修復 → 測試**
4. **加單元測試**（如果適用）
5. **commit**：`fix: 描述`
6. **更新工作日誌**

### 5.4 緊急 hotfix
如果是 production 當機，可以繞過 PR 流程：
```bash
git checkout main
git pull origin main
# 直接修
git add .
git commit -m "fix: 緊急修 X 問題"
git push origin main
# Vercel 自動部署
```

---

## 6. Commit 規範 SOP

### 6.1 Conventional Commits

| 前綴 | 用途 | 範例 |
|------|------|------|
| `feat:` | 新功能 | `feat(tictactoe): 新增結果畫面` |
| `fix:` | 修 bug | `fix: 修正房間頁沒顯示房號` |
| `refactor:` | 重構（無功能變動）| `refactor: 抽出 useAuth hook` |
| `docs:` | 文件 | `docs: 更新 README 進度` |
| `style:` | 格式（不影響邏輯）| `style: 修正縮排` |
| `test:` | 測試 | `test: 加 board 完整性測試` |
| `chore:` | 雜項 | `chore: 更新套件版本` |

### 6.2 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

- **subject**：簡短、不超過 50 字、動詞開頭
- **scope**：可選，影響範圍（檔案/模組名）
- **body**：可選，詳細描述
- **footer**：可選，參考 issue 或 breaking change

### 6.3 範例
```
feat(room): 新增房間系統與大廳

Phase 2 房間管理功能：
- 房間型別定義（Room, RoomPlayer, RoomStatus, GameType）
- 6 碼房號產生器（避開 0/1/I/O 易混淆字元）
- roomService：建立/加入/離開/準備/開始/重置/訂閱
- useRoom / useLobby hooks 訂閱 Firestore 變化
- RequireAuth 元件守護需登入頁面
- Lobby 頁：建立新房間、用房號加入、房間列表
- GameRoom 頁：等待大廳、玩家準備、開始遊戲、結果展示
```

---

## 7. 環境設定 SOP

### 7.1 第一次在本機開發
```bash
# 1. Clone repo
git clone https://github.com/clive520/multiplayer-games.git
cd multiplayer-games

# 2. 裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local，貼上 Firebase config

# 4. 啟動開發伺服器
npm run dev
# 開 http://localhost:5173
```

### 7.2 環境變數完整清單
| 變數 | 來源 |
|------|------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → 專案設定 |
| `VITE_FIREBASE_AUTH_DOMAIN` | 同上 |
| `VITE_FIREBASE_PROJECT_ID` | 同上 |
| `VITE_FIREBASE_STORAGE_BUCKET` | 同上 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 同上 |
| `VITE_FIREBASE_APP_ID` | 同上 |
| `VITE_FIREBASE_DATABASE_URL` | RTDB 控制台 |

---

## 8. 維運 SOP

### 8.1 監控位置
- **Vercel Analytics**：https://vercel.com/clive520s-projects/github_test/analytics
- **Firebase Usage**：https://console.firebase.google.com/project/multiplayer-games-73a8f/usage
- **Firestore Rules Monitor**：Firebase Console → Firestore → Rules → Monitor

### 8.2 配額警戒
- Firestore：50K 讀/日、20K 寫/日
- RTDB：1 GB 儲存、10 GB/月下載
- 達 80% 時考慮升級 Blaze

### 8.3 升級 Firebase 方案
1. Firebase Console → 專案設定 → Usage & billing
2. 選 Blaze 方案
3. 設定預算警報（Budget alerts）

---

## 9. 變更紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-06-12 | 初版建立 |
