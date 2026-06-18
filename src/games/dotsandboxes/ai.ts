import type { AIEngine } from '../../core/types/ai';
import { dotsAndBoxesEngine } from './engine';
import {
  BOX_ROWS,
  BOX_COLS,
  type DotsAndBoxesState,
  type EdgeDirection,
} from './types';

type Move = { type: EdgeDirection; row: number; col: number };

/**
 * 點點連連 AI 引擎（IMPROVEMENTS #9 擴充）
 *
 * 難度分級：
 * - easy：完全隨機
 * - normal：1-ply 啟發式（必取/必避 + 偏少 2-side 邊）
 * - hard：1-ply + 鏈長啟發式（避免送短鏈）
 *
 * 注意：點點連連是公認的「鏈遊戲」，完整 minimax 極為複雜。
 * 這裡用啟發式 MVP 範圍；可日後升級為 double-cross 策略。
 */

interface EdgeInfo {
  type: EdgeDirection;
  row: number;
  col: number;
  /**
   * 畫這條邊會形成的「2-side 方格」數量
   * （每個被影響的方格如果有「剛好 2 條邊」就會變成 3-side → 對手下一步可拿）
   * 越低越安全
   */
  twoSideCount: number;
  /** 畫這條邊會形成的「3-side 方格」數量（>= 1 表示這步可得分） */
  threeSideCount: number;
}

/** 取得所有尚未畫的邊 */
function getAvailableEdges(state: DotsAndBoxesState): EdgeInfo[] {
  const out: EdgeInfo[] = [];
  for (let r = 0; r < BOX_ROWS + 1; r++) {
    for (let c = 0; c < BOX_COLS; c++) {
      if (state.hEdges[r][c] === '') {
        out.push(analyzeEdge(state, 'h', r, c));
      }
    }
  }
  for (let r = 0; r < BOX_ROWS; r++) {
    for (let c = 0; c < BOX_COLS + 1; c++) {
      if (state.vEdges[r][c] === '') {
        out.push(analyzeEdge(state, 'v', r, c));
      }
    }
  }
  return out;
}

/** 計算畫這條邊會形成幾個 2-side / 3-side 方格 */
function analyzeEdge(
  state: DotsAndBoxesState,
  type: EdgeDirection,
  row: number,
  col: number,
): EdgeInfo {
  let twoSide = 0;
  let threeSide = 0;
  const affected = boxesAffectedBy(type, row, col);
  for (const { r, c } of affected) {
    if (state.boxOwners[r][c] !== '') continue; // 已被拿走
    const sides = countBoxSides(state, r, c);
    // 畫完後 sides+1：
    //   原本 1 → 2-side（對手下一步可拿 → 危險）
    //   原本 2 → 3-side（這步可得分 → 必取）
    //   原本 3 → 完成方格（這步可得分 → 必取）
    if (sides === 1) twoSide++;
    else if (sides === 2 || sides === 3) threeSide++;
  }
  return { type, row, col, twoSideCount: twoSide, threeSideCount: threeSide };
}

/** 一條邊影響哪些方格（最多 2 個） */
function boxesAffectedBy(
  type: EdgeDirection,
  row: number,
  col: number,
): Array<{ r: number; c: number }> {
  if (type === 'h') {
    // 水平邊在 (row, col)，影響上方 (row-1, col) 和下方 (row, col)
    const out: Array<{ r: number; c: number }> = [];
    if (row - 1 >= 0) out.push({ r: row - 1, c: col });
    if (row < BOX_ROWS) out.push({ r: row, c: col });
    return out;
  }
  // 垂直邊在 (row, col)，影響左方 (row, col-1) 和右方 (row, col)
  const out: Array<{ r: number; c: number }> = [];
  if (col - 1 >= 0) out.push({ r: row, c: col - 1 });
  if (col < BOX_COLS) out.push({ r: row, c: col });
  return out;
}

/** 計算某方格目前有幾條邊畫了 */
function countBoxSides(state: DotsAndBoxesState, r: number, c: number): number {
  let n = 0;
  if (state.hEdges[r][c] !== '') n++; // 上邊
  if (state.hEdges[r + 1][c] !== '') n++; // 下邊
  if (state.vEdges[r][c] !== '') n++; // 左邊
  if (state.vEdges[r][c + 1] !== '') n++; // 右邊
  return n;
}

/**
 * 計算當前所有可得分步的最大鏈長（若被迫給對手多個方格）
 * 用「連通 2-side 方格 + 1 條可畫邊的 3-side 方格」當鏈大小
 * MVP 簡化版：回傳「若隨便畫一條 3-side 邊，會被迫送給對手的方格數」= 鏈長下界
 */
function estimateChainLength(state: DotsAndBoxesState, start: { r: number; c: number }): number {
  const visited = new Set<string>();
  const stack: Array<{ r: number; c: number }> = [start];
  let count = 0;
  while (stack.length > 0) {
    const { r, c } = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (state.boxOwners[r][c] !== '') continue;
    visited.add(key);
    count++;
    // 找 4 個相鄰方格（透過共享邊）
    const neighbors: Array<{ r: number; c: number }> = [];
    if (state.hEdges[r][c] === '') {
      // 上邊沒畫
      if (r - 1 >= 0) neighbors.push({ r: r - 1, c });
    }
    // 上邊畫了不需要走（鏈只在「未畫邊」方向延伸）
    if (state.hEdges[r + 1][c] === '' && r + 1 < BOX_ROWS) {
      neighbors.push({ r: r + 1, c });
    }
    if (state.vEdges[r][c] === '' && c - 1 >= 0) {
      neighbors.push({ r, c: c - 1 });
    }
    if (state.vEdges[r][c + 1] === '' && c + 1 < BOX_COLS) {
      neighbors.push({ r, c: c + 1 });
    }
    for (const n of neighbors) {
      if (!visited.has(`${n.r},${n.c}`) && state.boxOwners[n.r][n.c] === '') {
        stack.push(n);
      }
    }
  }
  return count;
}

function pickBest(state: DotsAndBoxesState, preferShortChain: boolean): Move | null {
  const edges = getAvailableEdges(state);
  if (edges.length === 0) return null;

  // 1. 必取：3-side 邊（這步可得分）
  const scoring = edges.filter(e => e.threeSideCount > 0);
  if (scoring.length > 0) {
    // 取影響最多 3-side 方格的那條（一次拿最多方格）
    scoring.sort((a, b) => b.threeSideCount - a.threeSideCount);
    return { type: scoring[0].type, row: scoring[0].row, col: scoring[0].col };
  }

  // 2. 安全邊：twoSideCount === 0
  const safe = edges.filter(e => e.twoSideCount === 0);
  if (safe.length > 0) {
    // normal / hard 隨便選（之後 hard 可加「偏中心」或「破壞對手鏈」啟發式）
    return { type: safe[0].type, row: safe[0].row, col: safe[0].col };
  }

  // 3. 沒有安全邊 → 必須給對手至少 1 個 3-side 方格
  // normal: 選 twoSideCount 最少的（給最少方格）
  // hard: 從候選中選「估計鏈長」最短的
  const candidates = edges.slice();
  if (preferShortChain) {
    // 對每個 candidate 找會觸發的第一個 2-side 方格，計算鏈長
    let best: EdgeInfo | null = null;
    let bestChain = Infinity;
    for (const e of candidates) {
      // 找會形成的 2-side 方格
      const affected = boxesAffectedBy(e.type, e.row, e.col);
      let minChain = 0;
      for (const a of affected) {
        if (state.boxOwners[a.r][a.c] !== '') continue;
        const sides = countBoxSides(state, a.r, a.c);
        if (sides === 1) {
          const chain = estimateChainLength(state, { r: a.r, c: a.c });
          if (chain > minChain) minChain = chain;
        }
      }
      if (minChain < bestChain) {
        bestChain = minChain;
        best = e;
      }
    }
    if (best) return { type: best.type, row: best.row, col: best.col };
  }

  candidates.sort((a, b) => a.twoSideCount - b.twoSideCount);
  return { type: candidates[0].type, row: candidates[0].row, col: candidates[0].col };
}

export const dotsAndBoxesAI: AIEngine<DotsAndBoxesState, Move> = {
  gameType: 'dotsandboxes',
  selectMove(state, _symbol, difficulty) {
    if (difficulty === 'easy') {
      const edges = getAvailableEdges(state);
      if (edges.length === 0) return null;
      const e = edges[Math.floor(Math.random() * edges.length)];
      return { type: e.type, row: e.row, col: e.col };
    }
    if (difficulty === 'normal') {
      return pickBest(state, false);
    }
    // hard
    return pickBest(state, true);
  },
};

// 保留對 engine 的引用避免 lint 警告（之後可擴充）
void dotsAndBoxesEngine;
