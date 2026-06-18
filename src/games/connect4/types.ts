import type { MoveRecord } from '../../core/types/game';

/**
 * 四子棋（Connect 4）狀態型別
 *
 * 規則：
 * - 7×6 棋盤（42 格，索引 = row * 7 + col）
 * - 玩家輪流選一欄「下子」（從頂部落入，到該欄最低空格）
 * - 4 個連成線（橫/直/斜）即勝
 *
 * State 結構說明：
 * - board: 42 格，'' / 'X' / 'O'
 * - currentTurn: 下一位該下的玩家（X 為先手，固定規則）
 * - lastMove: 最近落子的 (row, col)（用於高亮「最後一手」）
 * - winnerLine: 4 連的 4 個座標（用於高亮獲勝線）
 */

export type Cell = 'X' | 'O' | '';
export type Board = Cell[];

export interface Connect4State {
  board: Board;
  currentTurn: 'X' | 'O';
  moveCount: number;
  lastMove: { row: number; col: number } | null;
  /** 4 連獲勝線（4 個座標）；null = 尚未獲勝 */
  winnerLine: ReadonlyArray<{ row: number; col: number }> | null;
  /** 棋譜歷史：sync 層在每次成功落子後 append；engine 不關心此欄位 */
  moves?: MoveRecord[];
}

export const COLS = 7;
export const ROWS = 6;
export const BOARD_SIZE = COLS;  // 棋盤「寬度」（用於 ReplayBoard 等 UI 元件）
export const TOTAL_CELLS = COLS * ROWS;
export const WIN_LENGTH = 4;
export const EMPTY_CELL: Cell = '';

export function createInitialState(): Connect4State {
  return {
    board: Array<Cell>(TOTAL_CELLS).fill(EMPTY_CELL),
    currentTurn: 'X',  // 固定 X 先手
    moveCount: 0,
    lastMove: null,
    winnerLine: null,
    moves: [],
  };
}

export function isValidState(value: unknown): value is Connect4State {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.board) || v.board.length !== TOTAL_CELLS) return false;
  if (v.currentTurn !== 'X' && v.currentTurn !== 'O') return false;
  if (typeof v.moveCount !== 'number') return false;
  return true;
}

/** 取得指定座標的 cell（row * COLS + col） */
export function getCell(state: Connect4State, row: number, col: number): Cell {
  return state.board[row * COLS + col];
}

/** 找出 col 欄最上面一個空格（即下一個落子位置）。回傳 row；欄滿了回傳 -1 */
export function findDropRow(board: ReadonlyArray<Cell>, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row * COLS + col] === EMPTY_CELL) {
      return row;
    }
  }
  return -1;
}
