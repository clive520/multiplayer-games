export type Cell = 'X' | 'O' | '';
export type Board = Cell[];

export interface ReversiState {
  board: Board;
  currentTurn: 'X' | 'O';
  moveCount: number;
  passCount: number; // 連續 pass 次數：0=正常、1=一方 pass、2=雙方都 pass → 結束
  lastMove: { row: number; col: number } | null;
  lastFlips: Array<{ row: number; col: number }>; // 上一步翻的棋子（高亮用）
}

export const BOARD_SIZE = 8;
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
export const EMPTY_CELL: Cell = '';

export function createInitialState(): ReversiState {
  const board: Board = Array<Cell>(TOTAL_CELLS).fill(EMPTY_CELL);
  // 標準開局：中央四格交叉擺放
  // 形式：
  //   . . . . . . . .
  //   . . . . . . . .
  //   . . . . . . . .
  //   . . . O X . . .
  //   . . . X O . . .
  //   . . . . . . . .
  //   . . . . . . . .
  //   . . . . . . . .
  const mid = BOARD_SIZE / 2;
  board[mid * BOARD_SIZE + mid] = 'O';         // (3,3) = O
  board[mid * BOARD_SIZE + (mid - 1)] = 'X';   // (3,2) = X
  board[(mid - 1) * BOARD_SIZE + mid] = 'X';   // (2,3) = X
  board[(mid - 1) * BOARD_SIZE + (mid - 1)] = 'O'; // (2,2) = O

  return {
    board,
    currentTurn: 'X', // 黑先（房主）
    moveCount: 0,
    passCount: 0,
    lastMove: null,
    lastFlips: [],
  };
}

export function isValidState(value: unknown): value is ReversiState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.board) || v.board.length !== TOTAL_CELLS) return false;
  if (v.currentTurn !== 'X' && v.currentTurn !== 'O') return false;
  if (typeof v.moveCount !== 'number') return false;
  if (typeof v.passCount !== 'number') return false;
  return true;
}

export function countPieces(state: ReversiState): { X: number; O: number } {
  let X = 0;
  let O = 0;
  for (const cell of state.board) {
    if (cell === 'X') X++;
    else if (cell === 'O') O++;
  }
  return { X, O };
}
