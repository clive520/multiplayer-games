import type { GameEngine, GameResult } from '../../core/types/game';
import {
  BOARD_SIZE,
  EMPTY_CELL,
  TOTAL_CELLS,
  WIN_LENGTH,
  createInitialState,
  type GomokuState,
  type Position,
} from './types';

function inBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 && row < BOARD_SIZE &&
    col >= 0 && col < BOARD_SIZE
  );
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],   // 水平 →
  [1, 0],   // 垂直 ↓
  [1, 1],   // 對角 ↘
  [1, -1],  // 反對角 ↙
];

function findWinningLine(
  state: GomokuState,
  lastRow: number,
  lastCol: number,
  symbol: 'X' | 'O'
): Position[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: Position[] = [{ row: lastRow, col: lastCol }];

    // 往前找
    let r = lastRow + dr;
    let c = lastCol + dc;
    while (inBounds(r, c) && state.board[r * BOARD_SIZE + c] === symbol) {
      line.unshift({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // 往後找
    r = lastRow - dr;
    c = lastCol - dc;
    while (inBounds(r, c) && state.board[r * BOARD_SIZE + c] === symbol) {
      line.push({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    if (line.length >= WIN_LENGTH) {
      // 從最長線段中取 WIN_LENGTH 個（包含落子點的）
      const centerIdx = line.findIndex(
        (p) => p.row === lastRow && p.col === lastCol
      );
      const startIdx = Math.max(0, Math.min(centerIdx - Math.floor(WIN_LENGTH / 2), line.length - WIN_LENGTH));
      return line.slice(startIdx, startIdx + WIN_LENGTH);
    }
  }
  return null;
}

export const gomokuEngine: GameEngine<GomokuState> = {
  id: 'gomoku',
  name: '五子棋',
  minPlayers: 2,
  maxPlayers: 2,
  description: `兩人輪流在 ${BOARD_SIZE}x${BOARD_SIZE} 棋盤上落子，先連成 ${WIN_LENGTH} 子者獲勝。`,
  initialSymbolPool: ['X', 'O'],

  getInitialState: () => createInitialState(),

  validateMove(state, move) {
    if (state.moveCount >= TOTAL_CELLS) return false;
    const payload = move.payload as Position;
    if (!inBounds(payload.row, payload.col)) return false;
    const idx = payload.row * BOARD_SIZE + payload.col;
    return state.board[idx] === EMPTY_CELL;
  },

  applyMove(state, move) {
    const payload = move.payload as Position;
    const idx = payload.row * BOARD_SIZE + payload.col;
    const symbol = state.nextSymbol;
    const board = [...state.board];
    board[idx] = symbol;
    const winnerLine = findWinningLine(
      { ...state, board },
      payload.row,
      payload.col,
      symbol
    );
    return {
      board,
      nextSymbol: symbol === 'X' ? 'O' : 'X',
      moveCount: state.moveCount + 1,
      lastMove: { row: payload.row, col: payload.col, symbol },
      winnerLine,
    };
  },

  checkResult(state, players): GameResult {
    if (state.winnerLine && state.winnerLine.length === WIN_LENGTH) {
      const last = state.lastMove;
      if (last) {
        const winner = players.find((p) => p.symbol === last.symbol);
        return { finished: true, winnerId: winner?.uid };
      }
    }
    if (state.moveCount >= TOTAL_CELLS) {
      return { finished: true, isDraw: true };
    }
    return { finished: false };
  },
};
