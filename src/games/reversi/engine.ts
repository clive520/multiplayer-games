import type { GameEngine, GameResult } from '../../core/types/game';
import {
  BOARD_SIZE,
  EMPTY_CELL,
  TOTAL_CELLS,
  createInitialState,
  type ReversiState,
  type Cell,
} from './types';

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],  // N
  [1, 0],   // S
  [0, -1],  // W
  [0, 1],   // E
  [-1, -1], // NW
  [-1, 1],  // NE
  [1, -1],  // SW
  [1, 1],   // SE
];

function inBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 && row < BOARD_SIZE &&
    col >= 0 && col < BOARD_SIZE
  );
}

function opponent(symbol: 'X' | 'O'): 'X' | 'O' {
  return symbol === 'X' ? 'O' : 'X';
}

/**
 * 從 (row, col) 出發，往 (dr, dc) 方向走，找出所有會被翻的棋子。
 * 規則：必須先遇到至少一個對手棋子，最後遇到自己棋子。
 * 若不符合，則該方向沒有翻子。
 */
function findFlipsInDirection(
  state: ReversiState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  playerSymbol: 'X' | 'O'
): Array<{ row: number; col: number }> {
  const opp = opponent(playerSymbol);
  const flips: Array<{ row: number; col: number }> = [];
  let r = row + dr;
  let c = col + dc;

  // 必須先連續遇到至少一個對手棋子
  while (inBounds(r, c) && state.board[r * BOARD_SIZE + c] === opp) {
    flips.push({ row: r, col: c });
    r += dr;
    c += dc;
  }

  // 結尾必須是自己棋子
  if (inBounds(r, c) && state.board[r * BOARD_SIZE + c] === playerSymbol && flips.length > 0) {
    return flips;
  }
  return [];
}

/**
 * 從某個位置出發，找出所有方向上會被翻的棋子總集。
 */
function findAllFlips(
  state: ReversiState,
  row: number,
  col: number,
  playerSymbol: 'X' | 'O'
): Array<{ row: number; col: number }> {
  const all: Array<{ row: number; col: number }> = [];
  for (const [dr, dc] of DIRECTIONS) {
    all.push(...findFlipsInDirection(state, row, col, dr, dc, playerSymbol));
  }
  return all;
}

export const reversiEngine: GameEngine<ReversiState> = {
  id: 'reversi',
  name: '黑白棋',
  minPlayers: 2,
  maxPlayers: 2,
  description: `兩人在 ${BOARD_SIZE}x${BOARD_SIZE} 棋盤上輪流落子，翻轉對手被夾住的棋子，遊戲結束時棋子多者勝。`,
  initialSymbolPool: ['X', 'O'],

  getInitialState: () => createInitialState(),

  validateMove(state, move) {
    const payload = move.payload as { row: number; col: number };
    const { row, col } = payload;
    if (!inBounds(row, col)) return false;
    const idx = row * BOARD_SIZE + col;
    if (state.board[idx] !== EMPTY_CELL) return false;
    // 至少要能翻一個方向
    const flips = findAllFlips(state, row, col, state.currentTurn);
    return flips.length > 0;
  },

  applyMove(state, move) {
    const payload = move.payload as { row: number; col: number };
    const { row, col } = payload;
    const playerSymbol = state.currentTurn;
    const board: Cell[] = [...state.board];

    // 放置新棋子
    board[row * BOARD_SIZE + col] = playerSymbol;

    // 翻子
    const flips = findAllFlips(state, row, col, playerSymbol);
    for (const { row: fr, col: fc } of flips) {
      board[fr * BOARD_SIZE + fc] = playerSymbol;
    }

    return {
      board,
      currentTurn: opponent(playerSymbol),
      moveCount: state.moveCount + 1,
      passCount: 0, // 成功落子重置 pass 計數
      lastMove: { row, col },
      lastFlips: flips,
    };
  },

  checkResult(state, players): GameResult {
    // 棋盤已滿（用實際填入的格子數判斷，moveCount 不等於此數，因為每次落子會翻好幾顆）
    const filledCells = state.board.reduce(
      (n, c) => (c !== EMPTY_CELL ? n + 1 : n),
      0
    );
    if (filledCells >= TOTAL_CELLS) {
      return declareWinner(state, players);
    }
    // 雙方連續都 pass（無人能走）
    if (state.passCount >= 2) {
      return declareWinner(state, players);
    }
    return { finished: false };
  },
};

function declareWinner(state: ReversiState, players: Array<{ uid: string; symbol: string }>): GameResult {
  let xCount = 0;
  let oCount = 0;
  for (const cell of state.board) {
    if (cell === 'X') xCount++;
    else if (cell === 'O') oCount++;
  }
  if (xCount === oCount) return { finished: true, isDraw: true };
  const winningSymbol = xCount > oCount ? 'X' : 'O';
  const winner = players.find((p) => p.symbol === winningSymbol);
  return {
    finished: true,
    winnerId: winner?.uid,
  };
}

/**
 * 判斷某個玩家在當前狀態下有沒有合法步。
 * 用於 pass 機制與 UI 提示。
 */
export function hasValidMove(state: ReversiState, playerSymbol: 'X' | 'O'): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const idx = row * BOARD_SIZE + col;
      if (state.board[idx] !== EMPTY_CELL) continue;
      const flips = findAllFlips(state, row, col, playerSymbol);
      if (flips.length > 0) return true;
    }
  }
  return false;
}
