import type { GameEngine, GameResult } from '../../core/types/game';
import {
  BOARD_SIZE,
  WIN_LINES,
  createInitialState,
  type TicTacToeMove,
  type TicTacToeState,
} from './types';

function inBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 && row < BOARD_SIZE &&
    col >= 0 && col < BOARD_SIZE
  );
}

export const tictactoeEngine: GameEngine<TicTacToeState> = {
  id: 'tictactoe',
  name: '井字遊戲',
  minPlayers: 2,
  maxPlayers: 2,
  description: '兩人輪流在 3×3 棋盤上放置 X 與 O，先連成一線者獲勝。',
  initialSymbolPool: ['X', 'O'],

  getInitialState: () => createInitialState(),

  validateMove(state, move) {
    if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) return false;
    const payload = move.payload as TicTacToeMove;
    if (!inBounds(payload.row, payload.col)) return false;
    const idx = payload.row * BOARD_SIZE + payload.col;
    return state.board[idx] === null;
  },

  applyMove(state, move) {
    const payload = move.payload as TicTacToeMove;
    const idx = payload.row * BOARD_SIZE + payload.col;
    const symbol = state.nextSymbol;
    const board = [...state.board];
    board[idx] = symbol;
    return {
      board,
      nextSymbol: symbol === 'X' ? 'O' : 'X',
      moveCount: state.moveCount + 1,
      lastMove: { row: payload.row, col: payload.col, symbol },
    };
  },

  checkResult(state, players): GameResult {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      const symbol = state.board[a];
      if (symbol && state.board[b] === symbol && state.board[c] === symbol) {
        const winner = players.find((p) => p.symbol === symbol);
        return { finished: true, winnerId: winner?.uid };
      }
    }
    if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) {
      return { finished: true, isDraw: true };
    }
    return { finished: false };
  },
};
