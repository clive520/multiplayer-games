/**
 * 點點連連（Dots and Boxes）狀態型別
 *
 * 規則：
 * - BOX_ROWS × BOX_COLS 的方格矩陣（預設 4×4 = 16 方格）
 * - 方格之間用「點」相連：(BOX_ROWS+1) × (BOX_COLS+1) 個點
 * - 玩家輪流畫「邊」（相鄰兩點之間的水平或垂直線）
 * - 畫完一條邊後，檢查是否完成方格：4 邊都畫了 → 該方格屬於畫邊者 + **額外一回合**
 * - 棋盤填滿時遊戲結束，**佔領較多方格者獲勝**
 *
 * State 設計：
 * - hEdges[row][col]：水平邊，row 範圍 [0, BOX_ROWS]、col 範圍 [0, BOX_COLS-1]
 *   - 連接 (row, col) 和 (row, col+1) 兩個點
 * - vEdges[row][col]：垂直邊，row 範圍 [0, BOX_ROWS-1]、col 範圍 [0, BOX_COLS]
 *   - 連接 (row, col) 和 (row+1, col) 兩個點
 * - boxOwners[row][col]：方格所有權
 *
 * 為什麼不用一維陣列：2D 比較直觀、引擎邏輯較簡單、序列化/反序列化簡單。
 */

import type { MoveRecord } from '../../core/types/game';

export type CellMark = 'X' | 'O' | null;

/** 邊的方向 */
export type EdgeDirection = 'h' | 'v';

/** 預設棋盤大小：4×4 方格 = 5×5 點 = 40 條邊（最多 40 步） */
export const BOX_ROWS = 4;
export const BOX_COLS = 4;
export const TOTAL_EDGES = (BOX_ROWS + 1) * BOX_COLS + BOX_ROWS * (BOX_COLS + 1); // 5*4 + 4*5 = 40
export const TOTAL_BOXES = BOX_ROWS * BOX_COLS; // 16

export interface DotsAndBoxesState {
  /** 水平邊：(BOX_ROWS+1) x BOX_COLS 的 'X' / 'O' / null */
  hEdges: CellMark[][];
  /** 垂直邊：BOX_ROWS x (BOX_COLS+1) 的 'X' / 'O' / null */
  vEdges: CellMark[][];
  /** 方格所有權：BOX_ROWS x BOX_COLS 的 'X' / 'O' / null */
  boxOwners: CellMark[][];
  /** 下一位該畫的玩家（'X' 先手） */
  currentTurn: 'X' | 'O';
  /** 已畫的邊數 */
  moveCount: number;
  /** 最後一步（用於高亮「最後畫的邊」） */
  lastMove: { type: EdgeDirection; row: number; col: number } | null;
  /** 兩人目前佔領的方格數（從 boxOwners 算也可，但存起來省事） */
  scores: { X: number; O: number };
  /** 棋譜歷史：sync 層在每次成功畫邊後 append */
  moves?: MoveRecord[];
}

export function createInitialState(): DotsAndBoxesState {
  return {
    hEdges: emptyGrid(BOX_ROWS + 1, BOX_COLS, null),
    vEdges: emptyGrid(BOX_ROWS, BOX_COLS + 1, null),
    boxOwners: emptyGrid(BOX_ROWS, BOX_COLS, null),
    currentTurn: 'X',
    moveCount: 0,
    lastMove: null,
    scores: { X: 0, O: 0 },
    moves: [],
  };
}

export function isValidState(value: unknown): value is DotsAndBoxesState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.hEdges) || v.hEdges.length !== BOX_ROWS + 1) return false;
  if (!Array.isArray(v.vEdges) || v.vEdges.length !== BOX_ROWS) return false;
  if (!Array.isArray(v.boxOwners) || v.boxOwners.length !== BOX_ROWS) return false;
  if (v.currentTurn !== 'X' && v.currentTurn !== 'O') return false;
  if (typeof v.moveCount !== 'number') return false;
  return true;
}

/** 工具：產生空網格 */
function emptyGrid<T>(rows: number, cols: number, fill: T): T[][] {
  return Array.from({ length: rows }, () => Array<T>(cols).fill(fill));
}

/** 工具：複製網格（immutable update 用） */
export function cloneGrid<T>(grid: ReadonlyArray<ReadonlyArray<T>>): T[][] {
  return grid.map((row) => [...row]);
}
