# Vercel 連線紀錄

> 最後更新：2026-06-12  
> 本專案：`clive520s-projects/github_test`  
> 部署網址：https://githubtest-blond.vercel.app

---

## 1. 連線需求

| 工具 | 用途 | 必備 |
|------|------|------|
| Vercel 帳號 | 帳號本體 | ✓ |
| Vercel CLI（`vercel`）| 命令列部署 | 建議 |
| Vercel Token | API 授權 | 程式化部署必備 |

---

## 2. 環境檢查

```bash
vercel --version
# Vercel CLI 54.13.0
```

---

## 3. 安裝 Vercel CLI

```bash
npm install -g vercel
```

---

## 4. 認證方式

### 4.1 瀏覽器登入（互動式）
```bash
vercel login
# 開瀏覽器授權
```

### 4.2 Token 認證（無頭/腳本化，推薦）
1. 到 https://vercel.com/account/tokens
2. 點 **「Create Token」**
3. 設定 Name、Scope、Expiration
4. 複製 token（格式：`vcp_xxx` 或 `vbs_xxx`）
5. 設定環境變數：
   ```bash
   # Windows PowerShell
   $env:VERCEL_TOKEN = "vcp_xxx"
   
   # Linux/macOS
   export VERCEL_TOKEN="vcp_xxx"
   ```
6. 驗證：
   ```bash
   vercel whoami
   # 顯示你的 username
   ```

---

## 5. 連結專案

### 5.1 在現有目錄連結
```bash
cd C:\opencode\github_test
vercel link --yes --scope <team-name>
```

> **Scope 是什麼**：個人帳號的 scope 是 `<username>s-projects`（不是 username）  
> 例：`clive520s-projects`

確認連結成功：
```bash
cat .vercel/project.json
# {"projectId":"...","orgId":"..."}
```

### 5.2 從 GitHub repo 建立（瀏覽器）
1. https://vercel.com/new
2. Import `clive520/multiplayer-games`
3. 設定環境變數（見下）
4. Deploy

---

## 6. 設定環境變數

### 6.1 命令列（互動）
```bash
vercel env add VITE_FIREBASE_API_KEY production
# 提示時貼上值
```

### 6.2 從檔案 pipe（無頭）
PowerShell：
```powershell
$value | vercel env add VITE_FIREBASE_API_KEY production --yes
```

### 6.3 在 Vercel Dashboard
Project → Settings → Environment Variables → Add

### 6.4 本專案環境變數清單
| 變數 | 環境 |
|------|------|
| `VITE_FIREBASE_API_KEY` | Production |
| `VITE_FIREBASE_AUTH_DOMAIN` | Production |
| `VITE_FIREBASE_PROJECT_ID` | Production |
| `VITE_FIREBASE_STORAGE_BUCKET` | Production |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Production |
| `VITE_FIREBASE_APP_ID` | Production |
| `VITE_FIREBASE_DATABASE_URL` | Production |

### 6.5 列出已設定
```bash
vercel env ls
```

### 6.6 刪除
```bash
vercel env rm VITE_FIREBASE_API_KEY production
```

---

## 7. 部署

### 7.1 正式環境部署
```bash
vercel --prod --yes
```

### 7.2 預覽部署（PR 自動）
- 開 PR → Vercel 自動建立 preview URL
- 合併 PR → 自動部署到 production

### 7.3 看部署結果
```bash
vercel ls
```

---

## 8. 常見錯誤

### 8.1 `Your codebase isn't linked to a project on Vercel`
未先 `vercel link`：
```bash
vercel link --yes --scope <team-name>
```

### 8.2 `You cannot set your Personal Account as the scope`
個人帳號的 scope 不是 username，是 `<username>s-projects`：
```bash
# ❌ 錯
vercel link --scope clive520

# ✓ 對
vercel link --scope clive520s-projects
```

### 8.3 `not_linked` 跑其他指令
先 `vercel link` 才行。

### 8.4 部署成功但 404
SPA 路由需要 `vercel.json` 的 rewrites（本專案已設定）：
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 8.5 部署成功但環境變數沒生效
Vite 環境變數在 build 時內嵌。**改 env 後要重新部署**：
```bash
vercel --prod --yes
```

---

## 9. 連結 GitHub 自動部署

`vercel link` 會自動偵測 GitHub repo 並連結。之後：
- push 到 `main` → 自動 production 部署
- 開 PR → 自動 preview 部署
- 合併 PR → 自動 production 部署

**取消連結**：
1. Vercel Dashboard → Project → Settings → Git
2. Disconnect

---

## 10. 自訂網域

1. Project → Settings → Domains → Add
2. 輸入網域（例如 `game.example.com`）
3. 設定 DNS（Vercel 會給指示）
4. 等待 SSL 憑證自動頒發
5. 別忘了到 **Firebase Authorized Domains** 加上新網域

---

## 11. 部署後檢查

- [ ] 網站可開啟
- [ ] 主頁正確顯示
- [ ] Google 登入可用（網域已加 Firebase）
- [ ] 環境變數正確（Vite 內嵌）
- [ ] SPA 路由正常（重新整理不會 404）

---

## 12. 監控

- Vercel Dashboard：https://vercel.com/clive520s-projects/github_test
- Analytics：https://vercel.com/clive520s-projects/github_test/analytics
- Logs：Project → Logs

---

## 13. 相關連結

- Vercel 官網：https://vercel.com/
- Vercel CLI 文件：https://vercel.com/docs/cli
- Tokens 設定：https://vercel.com/account/tokens
- 計費：https://vercel.com/pricing
- 環境變數：https://vercel.com/docs/environment-variables
