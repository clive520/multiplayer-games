# GitHub 連線紀錄

> 最後更新：2026-06-12  
> 本專案：multiplayer-games  
> Repo：https://github.com/clive520/multiplayer-games

---

## 1. 連線需求

| 工具 | 用途 | 必備 |
|------|------|------|
| Git | 版控工具 | ✓ |
| GitHub CLI (`gh`) | 命令列管理 GitHub | 建議 |
| 瀏覽器 | 登入 GitHub、查看 repo | ✓ |
| GitHub 帳號 | 帳號本體 | ✓ |
| Personal Access Token | API 呼叫授權 | 視需求 |

---

## 2. 環境檢查

```bash
git --version              # 確認 Git 安裝
gh --version               # 確認 gh CLI 安裝
gh auth status             # 確認是否已登入
git config --global --list # 確認全域 git 設定
```

預期輸出範例：
```
git version 2.53.0.windows.2
gh version 2.93.0 (2026-05-27)
github.com
  ✓ Logged in to github.com account <username> (keyring)
```

---

## 3. 第一次連線（本專案實際步驟）

### 3.1 登入 GitHub CLI
```bash
gh auth login
# 選 GitHub.com → HTTPS → Y 用瀏覽器登入
```

### 3.2 在本機建立 git repo
```bash
cd C:\opencode\github_test
git init -b main
```

### 3.3 在 GitHub 建立新 repo
```bash
gh repo create multiplayer-games --public --description "可擴充的多人遊戲平台"
```

### 3.4 連結遠端
```bash
git remote add origin https://github.com/<username>/multiplayer-games.git
git remote -v   # 確認
```

### 3.5 第一次提交
```bash
git add .
git status   # 確認 .env.local 等敏感檔沒被加入
git commit -m "chore: 初始化專案與開發計畫書"
git push -u origin main
```

### 3.6 驗證
```bash
gh api repos/<username>/multiplayer-games/contents/ | grep name
```

---

## 4. 日常使用流程

### 4.1 開發新功能
```bash
git checkout -b feature/xxx       # 從 main 切新分支
# 開發...
git add .
git commit -m "feat: ..."        # Conventional Commits
git push -u origin feature/xxx
# 在 GitHub 開 PR
```

### 4.2 合併 PR
- 在 GitHub 上 Review → Merge Pull Request
- 或本地：
  ```bash
  git checkout main
  git merge feature/xxx --no-ff -m "Merge branch 'feature/xxx'"
  git push origin main
  git branch -d feature/xxx
  git push origin --delete feature/xxx
  ```

### 4.3 Commit 訊息規範（Conventional Commits）
| 前綴 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修 bug |
| `refactor:` | 重構 |
| `docs:` | 文件 |
| `style:` | 格式（不影響邏輯）|
| `test:` | 測試 |
| `chore:` | 雜項 |

---

## 5. 常見問題

### Q1：`failed to push some refs`
遠端有 commit 本地沒有。先 pull：
```bash
git pull origin main --rebase
git push origin main
```

### Q2：LF/CRLF 警告
Windows 上的正常警告，無實質影響。要消除：
```bash
git config --global core.autocrlf true   # 自動轉換
```

### Q3：誤把 .env 推上去了
立刻撤銷：
```bash
# 從 git 歷史移除
git rm --cached .env.local
echo ".env.local" >> .gitignore
git commit -m "fix: 撤銷 .env.local"
# ⚠️ 但 token 已洩漏，必須到 Firebase/Vercel 重新生成
```

### Q4：想看某個檔案的歷史
```bash
git log --all -- <file>
git log --oneline --graph --decorate
```

---

## 6. 認證設定細節

### 6.1 HTTPS + Token（推薦）
```bash
gh auth login --with-token   # 貼 token 進去
```

### 6.2 SSH（進階）
```bash
ssh-keygen -t ed25519 -C "your@email.com"
# 把 ~/.ssh/id_ed25519.pub 加到 GitHub Settings > SSH keys
git remote set-url origin git@github.com:<username>/multiplayer-games.git
```

---

## 7. 與本專案相關

- **主分支**：`main`（受保護，建議透過 PR 合併）
- **功能分支命名**：`feature/<name>`、`fix/<name>`、`docs/<name>`
- **不要直接 push main**（除非緊急 hotfix）
- **Vercel 自動部署**已連結：push main → 自動部署到 production
- **PR 自動預覽**：開 PR → Vercel 自動建立預覽網址

---

## 8. 相關連結

- GitHub Repo：https://github.com/clive520/multiplayer-games
- GitHub Settings：https://github.com/settings
- Personal Access Tokens：https://github.com/settings/tokens
- GitHub CLI 文件：https://cli.github.com/manual/
- Conventional Commits：https://www.conventionalcommits.org/
