import type { MoveRecord } from '../../core/types/game';

export type Cell = 'X' | 'O' | '';
export type Board = Cell[]; // 9 個格子，索引 = row*3 + col

export interface TicTacToeState {
  board: Board;
  nextSymbol: 'X' | 'O';
  moveCount: number;
  lastMove: { row: number; col: number; symbol: 'X' | 'O' } | null;
  /** 棋譜歷史：sync 層在每次成功落子後 append；engine 不關心此欄位 */
  moves?: MoveRecord[];
}

export interface TicTacToeMove {
  row: number;
  col: number;
}

export const BOARD_SIZE = 3;
export const EMPTY_CELL: Cell = '';

export const WIN_LINES: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function createInitialState(): TicTacToeState {
  return {
    board: Array<Cell>(9).fill(EMPTY_CELL),
    nextSymbol: 'X',
    moveCount: 0,
    lastMove: null,
    moves: [],
  };
}

export function getCell(state: TicTacToeState, row: number, col: number): Cell {
  return state.board[row * BOARD_SIZE + col];
}

export function isValidState(value: unknown): value is TicTacToeState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.board) || v.board.length !== BOARD_SIZE * BOARD_SIZE) return false;
  if (v.nextSymbol !== 'X' && v.nextSymbol !== 'O') return false;
  if (typeof v.moveCount !== 'number') return false;
  return true;
}
