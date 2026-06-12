export type Cell = 'X' | 'O' | null;
export type Board = Cell[]; // 9 個格子，索引 = row*3 + col

export interface TicTacToeState {
  board: Board;
  nextSymbol: 'X' | 'O';
  moveCount: number;
  lastMove: { row: number; col: number; symbol: 'X' | 'O' } | null;
}

export interface TicTacToeMove {
  row: number;
  col: number;
}

export const BOARD_SIZE = 3;

export const WIN_LINES: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function createInitialState(): TicTacToeState {
  return {
    board: Array(9).fill(null),
    nextSymbol: 'X',
    moveCount: 0,
    lastMove: null,
  };
}

export function getCell(state: TicTacToeState, row: number, col: number): Cell {
  return state.board[row * BOARD_SIZE + col];
}
