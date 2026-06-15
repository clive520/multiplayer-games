import type { AIEngine } from '../../core/types/ai';
import {
  BOARD_SIZE,
  EMPTY_CELL,
  TOTAL_CELLS,
  type Cell,
  type ReversiState,
} from './types';

const CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0, BOARD_SIZE - 1],
  [BOARD_SIZE - 1, 0], [BOARD_SIZE - 1, BOARD_SIZE - 1],
];

// X-squares：角落斜對角的格子（放這裡會讓對手有機會佔角落）
const X_SQUARES: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, BOARD_SIZE - 2],
  [BOARD_SIZE - 2, 1], [BOARD_SIZE - 2, BOARD_SIZE - 2],
];

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function opponent(symbol: 'X' | 'O'): 'X' | 'O' {
  return symbol === 'X' ? 'O' : 'X';
}

interface FlipSet {
  flips: Array<{ row: number; col: number }>;
  totalFlips: number;
}

function findFlipsInDirection(
  board: Cell[],
  row: number,
  col: number,
  dr: number,
  dc: number,
  playerSymbol: 'X' | 'O',
): Array<{ row: number; col: number }> {
  const opp = opponent(playerSymbol);
  const flips: Array<{ row: number; col: number }> = [];
  let r = row + dr;
  let c = col + dc;
  while (inBounds(r, c) && board[r * BOARD_SIZE + c] === opp) {
    flips.push({ row: r, col: c });
    r += dr;
    c += dc;
  }
  if (inBounds(r, c) && board[r * BOARD_SIZE + c] === playerSymbol && flips.length > 0) {
    return flips;
  }
  return [];
}

function getMoveFlips(
  board: Cell[],
  row: number,
  col: number,
  playerSymbol: 'X' | 'O',
): FlipSet {
  const flips: Array<{ row: number; col: number }> = [];
  for (const [dr, dc] of DIRECTIONS) {
    flips.push(...findFlipsInDirection(board, row, col, dr, dc, playerSymbol));
  }
  return { flips, totalFlips: flips.length };
}

/**
 * 取得所有合法步（含每步會翻的數量）
 */
function getValidMoves(
  board: Cell[],
  playerSymbol: 'X' | 'O',
): Array<{ row: number; col: number; flips: number }> {
  const moves: Array<{ row: number; col: number; flips: number }> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r * BOARD_SIZE + c] !== EMPTY_CELL) continue;
      const { totalFlips } = getMoveFlips(board, r, c, playerSymbol);
      if (totalFlips > 0) {
        moves.push({ row: r, col: c, flips: totalFlips });
      }
    }
  }
  return moves;
}

/**
 * 評分：對當前玩家而言
 * - 角落極有價值（佔了就拿不走）
 * - X-squares 危險（會讓對手有機會佔角落）
 * - 邊比中間好（不易被翻）
 * - 行動力：合法步多比較好
 * - 子數：在殘局時很重要
 */
function evaluatePosition(
  board: Cell[],
  aiSymbol: 'X' | 'O',
  mobilityWeight: number = 5,
): number {
  const opp = opponent(aiSymbol);
  let score = 0;

  // 角落
  for (const [r, c] of CORNERS) {
    const v = board[r * BOARD_SIZE + c];
    if (v === aiSymbol) score += 100;
    else if (v === opp) score -= 100;
  }
  // X-squares：如果角落還沒被佔，X-squares 特別危險
  let cornerEmpty = true;
  for (const [r, c] of CORNERS) {
    if (board[r * BOARD_SIZE + c] !== EMPTY_CELL) cornerEmpty = false;
  }
  if (cornerEmpty) {
    for (const [r, c] of X_SQUARES) {
      const v = board[r * BOARD_SIZE + c];
      if (v === aiSymbol) score -= 25;
      else if (v === opp) score += 25;
    }
  }
  // 邊緣
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const isEdge = r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1;
      if (!isEdge) continue;
      // 角落不算（已加過分）
      if ((r === 0 || r === BOARD_SIZE - 1) && (c === 0 || c === BOARD_SIZE - 1)) continue;
      const v = board[r * BOARD_SIZE + c];
      if (v === aiSymbol) score += 5;
      else if (v === opp) score -= 5;
    }
  }
  // 行動力
  const myMobility = getValidMoves(board, aiSymbol).length;
  const oppMobility = getValidMoves(board, opp).length;
  score += mobilityWeight * (myMobility - oppMobility);
  // 棋子數（殘局才有意義，前期忽略）
  if (board.filter((c) => c !== EMPTY_CELL).length >= TOTAL_CELLS - 20) {
    let myCount = 0;
    let oppCount = 0;
    for (const cell of board) {
      if (cell === aiSymbol) myCount++;
      else if (cell === opp) oppCount++;
    }
    score += (myCount - oppCount) * 2;
  }

  return score;
}

/**
 * 模擬在某個位置落子（包含翻子）後的 board
 */
function simulateMove(
  board: Cell[],
  row: number,
  col: number,
  playerSymbol: 'X' | 'O',
): Cell[] {
  const newBoard = board.slice();
  newBoard[row * BOARD_SIZE + col] = playerSymbol;
  const { flips } = getMoveFlips(board, row, col, playerSymbol);
  for (const { row: fr, col: fc } of flips) {
    newBoard[fr * BOARD_SIZE + fc] = playerSymbol;
  }
  return newBoard;
}

function pickBestMove(
  board: Cell[],
  aiSymbol: 'X' | 'O',
  depth: number,
): { row: number; col: number } | null {
  const validMoves = getValidMoves(board, aiSymbol);
  if (validMoves.length === 0) return null;

  // 簡單啟發式：優先翻多的，角落大加分
  // Move ordering：先試分數高的（提升 alpha-beta）
  const scored = validMoves.map((m) => {
    let s = m.flips; // 基本分：翻越多越好
    // 角落極高優先
    for (const [cr, cc] of CORNERS) {
      if (m.row === cr && m.col === cc) s += 1000;
    }
    // X-squares 危險（角落還沒被佔時）
    let cornerEmpty = true;
    for (const [cr, cc] of CORNERS) {
      if (board[cr * BOARD_SIZE + cc] !== EMPTY_CELL) {
        cornerEmpty = false;
        break;
      }
    }
    if (cornerEmpty) {
      for (const [xr, xc] of X_SQUARES) {
        if (m.row === xr && m.col === xc) s -= 50;
      }
    }
    return { ...m, score: s };
  });
  scored.sort((a, b) => b.score - a.score);

  let bestScore = -Infinity;
  let bestMove: { row: number; col: number } | null = null;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of scored) {
    const newBoard = simulateMove(board, move.row, move.col, aiSymbol);
    const score = negamax(newBoard, aiSymbol, depth - 1, alpha, beta, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { row: move.row, col: move.col };
    }
    alpha = Math.max(alpha, bestScore);
    if (alpha >= beta) break;
  }
  return bestMove;
}

function negamax(
  board: Cell[],
  aiSymbol: 'X' | 'O',
  depth: number,
  alpha: number,
  beta: number,
  isMaxPlayer: boolean,
): number {
  const playerSymbol: 'X' | 'O' = isMaxPlayer ? aiSymbol : opponent(aiSymbol);
  // 終局判斷：棋盤滿或雙方都無合法步
  const filledCells = board.filter((c) => c !== EMPTY_CELL).length;
  const myMoves = getValidMoves(board, playerSymbol);
  if (filledCells >= TOTAL_CELLS || depth === 0 || (myMoves.length === 0 && getValidMoves(board, opponent(playerSymbol)).length === 0)) {
    return evaluatePosition(board, aiSymbol, 5);
  }
  if (myMoves.length === 0) {
    // 必須 pass：換對手
    return negamax(board, aiSymbol, depth - 1, alpha, beta, !isMaxPlayer);
  }
  // 簡化：行動力權重隨盤面填滿程度上升（暫未使用 evaluatePosition 內的動態權重）
  const _filledRatio = filledCells / TOTAL_CELLS;
  void _filledRatio;

  // Move ordering
  const scored = myMoves.map((m) => {
    let s = m.flips;
    for (const [cr, cc] of CORNERS) {
      if (m.row === cr && m.col === cc) s += 100;
    }
    return { ...m, score: s };
  });
  scored.sort((a, b) => (isMaxPlayer ? b.score - a.score : a.score - b.score));

  if (isMaxPlayer) {
    let value = -Infinity;
    for (const move of scored) {
      const newBoard = simulateMove(board, move.row, move.col, playerSymbol);
      const childScore = negamax(newBoard, aiSymbol, depth - 1, alpha, beta, false);
      value = Math.max(value, childScore);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const move of scored) {
      const newBoard = simulateMove(board, move.row, move.col, playerSymbol);
      const childScore = negamax(newBoard, aiSymbol, depth - 1, alpha, beta, true);
      value = Math.min(value, childScore);
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

export const reversiAI: AIEngine<ReversiState, { row: number; col: number }> = {
  gameType: 'reversi',
  selectMove(state, aiSymbol, difficulty) {
    if (state.currentTurn !== aiSymbol) return null;
    const validMoves = getValidMoves(state.board, aiSymbol);
    if (validMoves.length === 0) return null; // 呼叫端會判定為 pass

    if (difficulty === 'easy') {
      // 70% 隨機合法步，30% 挑最大翻數的
      if (Math.random() < 0.3) {
        validMoves.sort((a, b) => b.flips - a.flips);
        return { row: validMoves[0].row, col: validMoves[0].col };
      }
      const pick = validMoves[Math.floor(Math.random() * validMoves.length)];
      return { row: pick.row, col: pick.col };
    }

    if (difficulty === 'normal') {
      // 1-ply 啟發式（基本評分 + 行動力）
      const scored = validMoves.map((m) => {
        const newBoard = simulateMove(state.board, m.row, m.col, aiSymbol);
        return { ...m, score: evaluatePosition(newBoard, aiSymbol, 5) };
      });
      scored.sort((a, b) => b.score - a.score);
      return { row: scored[0].row, col: scored[0].col };
    }

    // hard：2-ply alpha-beta
    return pickBestMove(state.board, aiSymbol, 2);
  },
};

export const reversiAITestHelpers = {
  getValidMoves,
  evaluatePosition,
  simulateMove,
  findFlipsInDirection,
};
