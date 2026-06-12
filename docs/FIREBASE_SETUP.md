# Firebase Console 設定教學

> 對象：本專案（井字遊戲 + 未來擴充）  
> 預計時間：15-20 分鐘  
> 最後更新：2026-06-12

---

## 開始前準備

- 一個 Google 帳號（Gmail 就可）
- 瀏覽器（建議 Chrome）
- 信用卡資訊 **不需要**（Spark 免費方案足夠）

---

## 步驟 1：登入 Firebase Console

1. 打開 https://console.firebase.google.com/
2. 用你的 Google 帳號登入
3. 第一次使用會要求接受條款，點「**接受並繼續**」

---

## 步驟 2：建立 Firebase 專案

1. 點首頁的 **「+ 新增專案」**（或「Add project」）
2. 輸入專案名稱：`multiplayer-games`
   - **注意**：這只是顯示名稱，可隨時改
   - 下方會自動產生專案 ID（例如 `multiplayer-games-a1b2c3`），可點「**編輯**」自訂
   - **建議**：自訂專案 ID 為有意義的字串，例如 `multiplayer-games-clive`，未來難以更改
3. （選用）啟用 Google Analytics：
   - 對本專案**不建議開啟**，增加複雜度且免費額度內用不到
   - 把「啟用這個專案的 Google Analytics」開關**關閉**
4. 點 **「建立專案」**
5. 等候 30 秒到 1 分鐘，會出現「你的新專案已準備就緒」畫面
6. 點 **「繼續」** 進入專案總覽

---

## 步驟 3：註冊 Web App

1. 在專案總覽頁面中央，找到幾個平台圖示（iOS、Android、Web、Unity）
2. 點 **Web 圖示**（看起來像 `</>` 的圖示）
3. 輸入 App 暱稱：`multiplayer-games-web`
4. **不要**勾選「同時為這個應用程式設定 Firebase Hosting」（之後會用 GitHub Pages 部署）
5. 點 **「註冊應用程式」**
6. **重要**：下一步會顯示 Firebase config 物件，**先不要關閉視窗**，複製起來

### 你會看到的 Config 大概像這樣：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com"  // RTDB 才會有
};
```

7. 點 **「繼續到主控台」**

---

## 步驟 4：啟用 Google 認證

1. 左側選單找到 **「建構」**（Build）分類
2. 點 **「Authentication」** → 點 **「開始使用」**（Get started）
3. 進入 **「Sign-in method」** 分頁
4. 在「登入提供者」清單中找 **「Google」**，點進去
5. 把開關切到 **「啟用」**
6. 填寫：
   - **專案支援電子郵件**：選你自己的 Google 帳號
   - **專案公開名稱**：會自動帶 `multiplayer-games`，可改
7. 點 **「儲存」**

---

## 步驟 5：建立 Cloud Firestore

1. 左側選單 **「建構」** → 點 **「Firestore Database」** → **「建立資料庫」**
2. 選位置：
   - 預設推薦 `asia-east1 (Taiwan)` 或 `asia-east2 (Hong Kong)`（亞洲較近延遲低）
   - 點 **「下一步」**
3. 選安全規則模式：
   - 選 **「在測試模式下開始」**（30 天寬限期，方便開發）
   - **不要選「正式模式」**（正式模式會擋住所有讀寫，初期會卡住）
   - 點 **「建立」**
4. 等 1-2 分鐘建立完成

### 之後要替換的安全規則（先存檔，等程式碼就緒後再改）：

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

      match /history/{moveId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }

    match /leaderboard/{uid} {
      allow read: if request.auth != null;
      allow write: if false;  // 只能由後端或 Admin SDK 寫入
    }
  }
}
```

> 設定方式：在 Firestore 控制台切到 **「規則」** 分頁貼上後點「發布」

---

## 步驟 6：建立 Realtime Database

1. 左側選單 **「建構」** → 點 **「Realtime Database」** → **「建立資料庫」**
2. 選位置：**選和 Firestore 相同的位置**（例如 `asia-east1`）
3. 選安全規則模式：
   - 選 **「以測試模式啟動」**
   - 點 **「啟用」**
4. 建立完成後，網址列會顯示 RTDB URL，格式像：
   ```
   https://your-project-default-rtdb.asia-east1.firebasedatabase.app
   ```
   這就是 `databaseURL`

### 之後要替換的安全規則：

```json
{
  "rules": {
    "rooms-live": {
      "$roomId": {
        "state": {
          ".read": "auth != null",
          ".write": "auth != null && (
            !data.exists() ||
            data.child('players').child(auth.uid).exists()
          )"
        },
        "presence": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth != null && auth.uid === $uid"
          }
        },
        "chat": {
          ".read": "auth != null",
          ".write": "auth != null && (
            !data.exists() &&
            newData.child('uid').val() === auth.uid
          )"
        }
      }
    }
  }
}
```

> 設定方式：在 RTDB 控制台切到 **「規則」** 分頁貼上後點「發布」

---

## 步驟 7：設定授權網域

讓 Firebase 知道哪些網域可以使用你的 app（防盜用）。

1. 左側選單 **「Authentication」** → **「Settings」** 分頁 → **「授權網域」**（Authorized domains）
2. 預設會有以下網域（**不要刪除**）：
   - `localhost`
   - `your-project.firebaseapp.com`
3. 之後部署到 GitHub Pages / Vercel 時，再回來新增 `your-username.github.io` 或自訂網域

---

## 步驟 8：取得完整 Config

回到 **「專案設定」** 取得完整 config：

1. 點左上方齒輪 ⚙️ → **「專案設定」**（Project settings）
2. 捲到 **「你的應用程式」** → 找到你註冊的 Web app
3. 在 **「SDK 設定與配置」** 選 **「Config」**（不是 CDN 或 npm）
4. 複製整段 firebaseConfig 物件

---

## 步驟 9：把 Config 給我

**請把以下資訊貼給我**（可直接貼，會在 `.env.local` 妥善保存，不入版控）：

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

---

## 常見問題

### Q1: 為什麼不用 Hosting？
本專案部署到 GitHub Pages 或 Vercel，Firebase Hosting 與其並用會增加複雜度。

### Q2: 為什麼 Firestore 選「測試模式」？
測試模式允許所有讀寫 30 天，方便開發初期。30 天後規則失效，屆時我們要部署正式規則（步驟 5、6 提供的規則已準備好）。

### Q3: 免費額度會不會爆？
Spark 方案：
- Firestore：1 GB 儲存、每天 5 萬次讀、2 萬次寫
- RTDB：1 GB 儲存、每月 10 GB 下載
- Authentication：每月 5 萬次驗證

對小型休閒遊戲（幾百人以下）絕對夠用。

### Q4: 找不到「建構」選單？
Firebase Console 介面中，服務分為「建構」(Build)、「發布與監控」(Run & Monitoring)、「參與」(Engage) 三大類，認證、資料庫都歸在「建構」。

### Q5: 可以多人協作嗎？
可以，到「專案設定 → 使用者和權限」新增成員，給 Editor 角色即可。

---

## 設定完成後的檢查清單

- [ ] 專案已建立，名稱 `multiplayer-games`
- [ ] Web app 已註冊
- [ ] Google 認證已啟用
- [ ] Firestore 已建立（測試模式）
- [ ] Realtime Database 已建立（測試模式）
- [ ] 完整 config 已複製
- [ ] Config 貼給我

---

## 下一步

我會幫你：
1. 把 config 寫入 `.env.local`（不入版控）
2. 安裝 Firebase SDK：`npm install firebase`
3. 建立 `src/core/firebase/` 的初始化程式碼
4. 實作 Google 登入按鈕
5. 提交到 GitHub
