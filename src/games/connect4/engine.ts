import type { GameEngine, GameResult } from '../../core/types/game';
import {
  COLS,
  ROWS,
  TOTAL_CELLS,
  WIN_LENGTH,
  EMPTY_CELL,
  createInitialState,
  isValidState,
  type Connect4State,
  type Cell,
} from './types';

function inBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 && row < ROWS &&
    col >= 0 && col < COLS
  );
}

function opponent(symbol: 'X' | 'O'): 'X' | 'O' {
  return symbol === 'X' ? 'O' : 'X';
}

function findDropRow(board: Cell[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row * COLS + col] === EMPTY_CELL) {
      return row;
    }
  }
  return -1;
}

/** 從 (row, col) 出發，沿 (dr, dc) 方向數同色棋子數（含自己） */
function countLine(
  board: Cell[],
  row: number,
  col: number,
  dr: number,
  dc: number,
  symbol: 'X' | 'O',
): { count: number; line: Array<{ row: number; col: number }> } {
  let count = 0;
  const line: Array<{ row: number; col: number }> = [];
  let r = row;
  let c = col;
  while (inBounds(r, c) && board[r * COLS + c] === symbol) {
    count += 1;
    line.push({ row: r, col: c });
    r += dr;
    c += dc;
  }
  return { count, line };
}

/**
 * 檢查 (row, col) 是否形成 WIN_LENGTH 連線
 * 回傳 4 個座標的連線（如果有的話）
 */
function findWinnerLine(
  board: Cell[],
  row: number,
  col: number,
  symbol: 'X' | 'O',
): Array<{ row: number; col: number }> | null {
  const directions: ReadonlyArray<readonly [number, number]> = [
    [0, 1],   // 水平 →
    [1, 0],   // 垂直 ↓
    [1, 1],   // 對角 ↘
    [1, -1],  // 反對角 ↙
  ];
  for (const [dr, dc] of directions) {
    // 往一邊算 + 往反方向算，總共 >= WIN_LENGTH 即獲勝
    const forward = countLine(board, row + dr, col + dc, dr, dc, symbol);
    const backward = countLine(board, row - dr, col - dc, -dr, -dc, symbol);
    if (forward.count + backward.count + 1 >= WIN_LENGTH) {
      // 拼出完整 4 連（含落子點）
      const line = [
        ...backward.line.slice().reverse(),
        { row, col },
        ...forward.line,
      ].slice(0, WIN_LENGTH);
      return line;
    }
  }
  return null;
}

export const connect4Engine: GameEngine<Connect4State> = {
  id: 'connect4',
  name: '四子棋',
  minPlayers: 2,
  maxPlayers: 2,
  description: `兩人在 ${COLS}×${ROWS} 棋盤上輪流下子，${WIN_LENGTH} 個連成一線（橫/直/斜）者獲勝。`,
  initialSymbolPool: ['X', 'O'],

  getInitialState: () => createInitialState(),

  validateMove(state, move) {
    const payload = move.payload as { col: number };
    if (typeof payload?.col !== 'number') return false;
    if (!inBounds(state.lastMove?.row ?? 0, payload.col)) {
      // 仍要檢查 col 範圍
      if (payload.col < 0 || payload.col >= COLS) return false;
    }
    // 欄滿了
    if (findDropRow(state.board, payload.col) === -1) return false;
    return true;
  },

  applyMove(state, move) {
    const payload = move.payload as { col: number };
    const col = payload.col;
    const dropRow = findDropRow(state.board, col);
    if (dropRow === -1) {
      throw new Error(`[connect4] col ${col} 沒有空格`);
    }
    const symbol = state.currentTurn;
    const board: Cell[] = [...state.board];
    board[dropRow * COLS + col] = symbol;
    const winnerLine = findWinnerLine(board, dropRow, col, symbol);
    return {
      board,
      currentTurn: opponent(symbol),
      moveCount: state.moveCount + 1,
      lastMove: { row: dropRow, col },
      winnerLine,
    };
  },

  checkResult(state, players): GameResult {
    // 1. 有 4 連線 → 玩家贏
    if (state.winnerLine && state.winnerLine.length === WIN_LENGTH) {
      const last = state.lastMove;
      if (last) {
        const winner = players.find((p) => p.symbol === state.board[last.row * COLS + last.col]);
        return { finished: true, winnerId: winner?.uid };
      }
    }
    // 2. 棋盤滿了（42 格） → 平局
    if (state.moveCount >= TOTAL_CELLS) {
      return { finished: true, isDraw: true };
    }
    return { finished: false };
  },
};

// 補充：isValidState 重新 export 給 sync / 測試用
export { isValidState };
