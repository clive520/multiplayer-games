// 批次把 coffee-* class 換成 app-* 語義色 class
// 用意：把淺色主題從「寫死 coffee」改成「語義色 + CSS 變數」，
//       讓多主題切換不需動元件，只要改 :root 的 CSS 變數即可。
//
// 對映：
//   bg-coffee-50       → bg-app-bg           （body 底色）
//   bg-coffee-100      → bg-app-card         （卡片底色）
//   bg-coffee-200      → bg-app-hover        （hover 狀態）
//   bg-coffee-300      → bg-app-border-strong（強調/按鈕底）
//   border-coffee-200  → border-app-border   （一般邊框）
//   border-coffee-300  → border-app-border-strong（強調邊框）
//   hover:bg-coffee-50 → hover:bg-app-bg
//   hover:bg-coffee-100 → hover:bg-app-card
//   hover:bg-coffee-200 → hover:bg-app-hover
//   hover:bg-coffee-300 → hover:bg-app-border-strong
//
// 排除：tailwind.config.js 本身（不能改）
// dry-run 預設 true（列印統計），加 --apply 改寫檔案

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

const ROOT = process.cwd();
const SRC_DIRS = ['src', 'index.html'];
const EXTS = new Set(['.tsx', '.ts', '.jsx', '.js', '.html', '.css']);

// 對映規則（順序重要：先長前綴，再短前綴，避免錯誤匹配）
// 用 regex 確保 word boundary
const rules = [
  // bg / border / hover
  { pattern: /\bbg-coffee-300\b/g, replace: 'bg-app-border-strong' },
  { pattern: /\bbg-coffee-200\b/g, replace: 'bg-app-hover' },
  { pattern: /\bbg-coffee-100\b/g, replace: 'bg-app-card' },
  { pattern: /\bbg-coffee-50\b/g, replace: 'bg-app-bg' },
  { pattern: /\bborder-coffee-300\b/g, replace: 'border-app-border-strong' },
  { pattern: /\bborder-coffee-200\b/g, replace: 'border-app-border' },
  { pattern: /\bhover:bg-coffee-300\b/g, replace: 'hover:bg-app-border-strong' },
  { pattern: /\bhover:bg-coffee-200\b/g, replace: 'hover:bg-app-hover' },
  { pattern: /\bhover:bg-coffee-100\b/g, replace: 'hover:bg-app-card' },
  { pattern: /\bhover:bg-coffee-50\b/g, replace: 'hover:bg-app-bg' },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(p, files);
    } else {
      if (EXTS.has(extname(p))) files.push(p);
    }
  }
  return files;
}

const files = SRC_DIRS.flatMap(d => {
  const abs = join(ROOT, d);
  try {
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  } catch {
    return [];
  }
});

let totalFiles = 0;
let totalReplacements = 0;
const perFile = [];

for (const f of files) {
  // 跳過 tailwind config（不能改）
  if (f.endsWith('tailwind.config.js') || f.endsWith('tailwind.config.ts')) continue;
  // 跳過這個 script 本身
  if (f.includes('replace-coffee-with-vars.mjs')) continue;

  const original = readFileSync(f, 'utf8');
  let current = original;
  let fileReplacements = 0;

  for (const r of rules) {
    const matches = current.match(r.pattern);
    if (matches) {
      fileReplacements += matches.length;
      current = current.replace(r.pattern, r.replace);
    }
  }

  if (fileReplacements > 0) {
    totalFiles += 1;
    totalReplacements += fileReplacements;
    perFile.push({ file: relative(ROOT, f), count: fileReplacements });
    if (apply) writeFileSync(f, current, 'utf8');
  }
}

// 報告
const header = apply ? '[APPLY]' : '[DRY-RUN]';
console.log(`\n${header} coffee → app 替換統計\n${'='.repeat(40)}`);
for (const { file, count } of perFile) {
  console.log(`  ${count.toString().padStart(3)}  ${file}`);
}
console.log('-'.repeat(40));
console.log(`  影響檔案：${totalFiles}`);
console.log(`  替換次數：${totalReplacements}`);
if (!apply) {
  console.log(`\n  加 --apply 套用變更`);
}
