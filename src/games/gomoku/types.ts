export type Cell = 'X' | 'O' | '';
export type Board = Cell[]; // 225 個格子，索引 = row*15 + col

export interface Position {
  row: number;
  col: number;
}

export interface GomokuState {
  board: Board;
  nextSymbol: 'X' | 'O';
  moveCount: number;
  lastMove: { row: number; col: number; symbol: 'X' | 'O' } | null;
  winnerLine: Position[] | null; // 5 連珠的格子（5 個）
}

export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;
export const EMPTY_CELL: Cell = '';
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

export function createInitialState(): GomokuState {
  return {
    board: Array<Cell>(TOTAL_CELLS).fill(EMPTY_CELL),
    nextSymbol: 'X',
    moveCount: 0,
    lastMove: null,
    winnerLine: null,
  };
}

export function getCell(state: GomokuState, row: number, col: number): Cell {
  return state.board[row * BOARD_SIZE + col];
}

export function isValidState(value: unknown): value is GomokuState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.board) || v.board.length !== TOTAL_CELLS) return false;
  if (v.nextSymbol !== 'X' && v.nextSymbol !== 'O') return false;
  if (typeof v.moveCount !== 'number') return false;
  return true;
}
