/**
 * 批次加 dark: prefix 到 Tailwind class（IMPROVEMENTS #18）
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = 'src';

// 對應表：dark: 前綴的 class + 對應的 light 版 class
const CLASS_MAP = {
  // 背景
  'bg-slate-900': 'dark:bg-slate-900 bg-slate-50',
  'bg-slate-800': 'dark:bg-slate-800 bg-white',
  'bg-slate-700': 'dark:bg-slate-700 bg-slate-200',
  'bg-slate-600': 'dark:bg-slate-600 bg-slate-300',
  // 文字
  'text-white': 'dark:text-white text-slate-900',
  'text-slate-100': 'dark:text-slate-100 text-slate-900',
  'text-slate-200': 'dark:text-slate-200 text-slate-800',
  'text-slate-300': 'dark:text-slate-300 text-slate-700',
  'text-slate-400': 'dark:text-slate-400 text-slate-600',
  // 邊框
  'border-slate-700': 'dark:border-slate-700 border-slate-200',
  'border-slate-600': 'dark:border-slate-600 border-slate-300',
};

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      walk(p, files);
    } else if (['.tsx', '.ts'].includes(extname(name)) && !name.endsWith('.test.ts')) {
      files.push(p);
    }
  }
  return files;
}

function addDarkPrefix(content) {
  let changed = 0;
  let newContent = content;
  for (const [orig, mapped] of Object.entries(CLASS_MAP)) {
    const pattern = new RegExp(`(?<!dark:)\\b${orig}\\b`, 'g');
    const matches = newContent.match(pattern);
    if (matches) {
      changed += matches.length;
      newContent = newContent.replace(pattern, mapped);
    }
  }
  return { newContent, changed };
}

const files = walk(ROOT);
let totalChanged = 0;
let filesChanged = 0;
for (const f of files) {
  const content = readFileSync(f, 'utf-8');
  const { newContent, changed } = addDarkPrefix(content);
  if (changed > 0) {
    writeFileSync(f, newContent, 'utf-8');
    filesChanged++;
    totalChanged += changed;
    console.log(`✓ ${f}: ${changed} 個 class`);
  }
}
console.log(`\n總計：${filesChanged} 個檔案，${totalChanged} 個 class 加上 dark: prefix`);
