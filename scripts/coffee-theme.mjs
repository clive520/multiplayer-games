/**
 * 批次把淺色模式背景換成淺咖啡色（IMPROVEMENTS #18 補強）
 *
 * 把所有 dark: 前綴的 light 對應色換成 coffee-* 色階：
 * - bg-slate-50   → bg-coffee-50   （body 主背景）
 * - bg-white      → bg-coffee-100  （cards 背景）
 * - border-slate-200 → border-coffee-200 （邊框）
 *
 * 只動 dark: 後面的「light 版」class，不動 dark: 本身的 dark 版
 * 避免重複轉換（idempotent）
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = 'src';

// 對應表：dark: 前綴後的 light 版 class → 換成 coffee 版
const REPLACE_MAP = [
  // 完整 dark:XXX bg-light 對
  { from: 'dark:bg-slate-50 bg-slate-50', to: 'dark:bg-slate-50 bg-coffee-50' },
  { from: 'dark:bg-slate-800 bg-white', to: 'dark:bg-slate-800 bg-coffee-100' },
  { from: 'dark:bg-slate-700 bg-slate-200', to: 'dark:bg-slate-700 bg-coffee-200' },
  { from: 'dark:bg-slate-600 bg-slate-300', to: 'dark:bg-slate-600 bg-coffee-300' },
  { from: 'dark:border-slate-700 border-slate-200', to: 'dark:border-slate-700 border-coffee-200' },
  { from: 'dark:border-slate-600 border-slate-300', to: 'dark:border-slate-600 border-coffee-300' },
  // 純 light 模式：按鈕/輸入/hover 等
  { from: 'border-slate-200 px-2', to: 'border-coffee-200 px-2' },
  { from: 'border-slate-300 ', to: 'border-coffee-300 ' },
  { from: 'border-slate-300"', to: 'border-coffee-300"' },
  { from: 'bg-slate-200 dark:', to: 'bg-coffee-200 dark:' },
  { from: 'bg-slate-300 dark:', to: 'bg-coffee-300 dark:' },
  { from: 'hover:bg-slate-300 ', to: 'hover:bg-coffee-300 ' },
  { from: 'hover:bg-slate-300"', to: 'hover:bg-coffee-300"' },
  // 純 light 用在 border 與 hover
  { from: 'border-slate-200 ', to: 'border-coffee-200 ' },
  { from: 'border-slate-200"', to: 'border-coffee-200"' },
  // 也支援 html.dark fallback 用的 coffee-50
  { from: 'background-color: #f8fafc', to: 'background-color: #f9f1de' },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      walk(p, files);
    } else if (['.tsx', '.ts', '.css', '.html'].includes(extname(name)) && !name.endsWith('.test.ts')) {
      files.push(p);
    }
  }
  return files;
}

const files = walk(ROOT);
let totalChanged = 0;
let filesChanged = 0;
for (const f of files) {
  let content = readFileSync(f, 'utf-8');
  let fileChanged = 0;
  for (const { from, to } of REPLACE_MAP) {
    // 用 split 計數避免重複處理
    const count = content.split(from).length - 1;
    if (count > 0) {
      content = content.split(from).join(to);
      fileChanged += count;
    }
  }
  if (fileChanged > 0) {
    writeFileSync(f, content, 'utf-8');
    filesChanged++;
    totalChanged += fileChanged;
    console.log(`✓ ${f}: ${fileChanged} 個替換`);
  }
}
console.log(`\n總計：${filesChanged} 個檔案，${totalChanged} 個替換`);
