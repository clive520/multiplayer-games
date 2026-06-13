# Firebase 連線紀錄

> 最後更新：2026-06-12  
> 本專案：multiplayer-games-73a8f  
> 計費方案：Spark（免費）

---

## 1. 連線需求

| 工具 | 用途 | 必備 |
|------|------|------|
| 瀏覽器 | Firebase Console 操作 | ✓ |
| Google 帳號 | 登入 Firebase | ✓ |
| Firebase CLI（`firebase-tools`）| 命令列部署 | 建議 |
| Firebase config object | SDK 連線用 | 建立後取得 |

---

## 2. 建立新 Firebase 專案

### 2.1 開 Firebase Console
https://console.firebase.google.com/

### 2.2 建立專案
1. 點 **「+ 新增專案」**（或 Add project）
2. 輸入專案名稱：`multiplayer-games`
3. **專案 ID**：點「編輯」自訂（無法事後改），例：`multiplayer-games-73a8f`
4. **Google Analytics**：**關閉**（不需要）
5. 點「建立專案」→ 等 1 分鐘 → 「繼續」

### 2.3 註冊 Web App
1. 專案總覽頁 → 找中央的 `</>` **Web 圖示**
2. App 暱稱：`multiplayer-games-web`
3. **不要勾選** Firebase Hosting
4. 點「註冊應用程式」

### 2.4 複製 config
SDK 設定 → Config：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:..."
};
```

---

## 3. 啟用服務

### 3.1 Authentication（Google 登入）
1. 左選單 **「建構」** → **「Authentication」** → **「開始使用」**
2. **「Sign-in method」** 分頁 → 點 **「Google」**
3. 切到啟用 → 填支援電子郵件 → 儲存

### 3.2 Firestore Database
1. 左選單 → **「Firestore Database」** → **「建立資料庫」**
2. 位置：`asia-east1`（台灣）或 `asia-southeast1`（新加坡）
3. 模式：**「在測試模式下開始」**（30 天寬限期）
4. 建立

### 3.3 Realtime Database
1. 左選單 → **「Realtime Database」** → **「建立資料庫」**
2. 位置：**和 Firestore 相同**
3. 模式：**「以測試模式啟動」**
4. 啟用後複製顯示的 URL

---

## 4. 本地端整合

### 4.1 環境變數
在 `.env.local`：
```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...:web:...
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

**重要**：`.env.local` 必須在 `.gitignore` 中！

### 4.2 安全規則
- **測試模式**：30 天後規則失效，必須改正式規則
- 正式規則在 `firebase/firestore.rules` 與 `firebase/database.rules.json`
- 部署：
  ```bash
  firebase deploy --only firestore:rules,database
  ```

### 4.3 授權網域（Google 登入白名單）
Authentication → Settings → Authorized Domains → Add domain

需要加入的網域：
| 網域 | 用途 |
|------|------|
| `localhost` | 本機開發（預設已有）|
| `your-project.firebaseapp.com` | Firebase Hosting（預設已有）|
| `your-app.vercel.app` | Vercel 部署 |
| `yourdomain.com` | 自訂網域（選用）|

---

## 5. 服務分工原則

| 資料類型 | 服務 | 原因 |
|---------|------|------|
| 使用者 profile | Firestore | 結構化、需要查詢 |
| 房間 metadata | Firestore | 文件型、需 where + 排序 |
| 對戰歷史 | Firestore | 累積資料、需查詢 |
| 即時棋盤狀態 | Realtime DB | 低延遲同步 |
| 玩家在線 | Realtime DB | presence、onDisconnect |
| 排行榜 | Firestore | orderBy + limit |
| 隱私資料（UNO 手牌）| Firestore | 安全規則控制 |

**規則**：能 query 的放 Firestore，要即時同步的放 RTDB。

---

## 6. 複合索引陷阱

### Q：為什麼 Firestore 查詢靜默失敗？
where + orderBy 跨欄位需要**複合索引**。沒建就會在 console 報錯，UI 顯示「載入中」永遠不會停。

### 解法 A：到 Console 建索引
錯誤訊息通常有「create index here」連結，點下去建好等幾分鐘。

### 解法 B：改用 client 端過濾（推薦）
```typescript
// 不要這樣：
const q = query(
  collection(db, 'rooms'),
  where('status', 'in', ['waiting', 'playing']),  // 需複合索引
  orderBy('createdAt', 'desc'),
);

// 改這樣：
const q = query(
  collection(db, 'rooms'),
  orderBy('createdAt', 'desc'),
  limit(60)  // 多拉一些
);
// 然後在 client 端 filter
const filtered = snapshot.docs
  .map(d => d.data())
  .filter(r => r.status === 'waiting' || r.status === 'playing')
  .slice(0, 20);
```

---

## 7. RTDB 特殊注意事項

### 7.1 null 陣列問題
RTDB **不支援陣列中的 null**！
```typescript
// ❌ board 變 undefined
board: [null, null, null, null, null, null, null, null, null]

// ✓ 用空字串
board: ['', '', '', '', '', '', '', '', '']
```

### 7.2 onDisconnect
自動處理斷線：
```typescript
const ref = ref(rtdb, `presence/${uid}`);
await set(ref, { online: true, ... });
await onDisconnect(ref).set({ online: false, ... });
```

### 7.3 transaction 確保原子性
```typescript
import { ref, runTransaction } from 'firebase/database';

await runTransaction(stateRef, (current) => {
  if (!current) return current;  // 沒資料就放棄
  if (current.nextSymbol !== mySymbol) return;  // 不是我方回合
  return applyMove(current, move);
});
```

---

## 8. 部署到 Firebase Hosting（選用）

### 8.1 安裝 CLI
```bash
npm install -g firebase-tools
```

### 8.2 登入
```bash
firebase login
```

### 8.3 初始化（首次）
```bash
firebase init
# 選 Firestore、Hosting、Database
# 指向現有專案 multiplayer-games-73a8f
```

### 8.4 部署
```bash
# 部署規則
firebase deploy --only firestore:rules,database

# 部署網站
npm run build
firebase deploy --only hosting
```

---

## 9. 相關連結

- Firebase Console：https://console.firebase.google.com/
- 本專案：https://console.firebase.google.com/project/multiplayer-games-73a8f
- Firebase 計費：https://firebase.google.com/pricing
- 安全規則文件：https://firebase.google.com/docs/rules
- RTDB vs Firestore 比較：https://firebase.google.com/docs/database/rtdb-vs-firestore
