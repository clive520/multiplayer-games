import type { AIEngine } from '../../core/types/ai';
import { BOARD_SIZE, EMPTY_CELL, TOTAL_CELLS, type Board, type Cell, type GomokuState, type Position } from './types';

const CENTER = Math.floor(BOARD_SIZE / 2);

// 形勢評分（自身 / 對手共用，但加總時對手要當負分）
const SCORES = {
  WIN: 1_000_000,
  OPEN_FOUR: 100_000,
  CLOSED_FOUR: 10_000,
  OPEN_THREE: 1_000,
  CLOSED_THREE: 100,
  OPEN_TWO: 50,
  CLOSED_TWO: 10,
} as const;

const FOUR_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function cellAt(board: Board, r: number, c: number): Cell | 'WALL' {
  if (!inBounds(r, c)) return 'WALL';
  return board[r * BOARD_SIZE + c];
}

/**
 * 找鄰近石頭的候選步：只考慮周圍 2 格內有石頭的空位
 * 第一手：正中央
 * 沒找到候選步：fallback 回正中央
 */
function getCandidateMoves(state: GomokuState): Position[] {
  if (state.moveCount === 0) {
    return [{ row: CENTER, col: CENTER }];
  }
  const candidates = new Set<number>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r * BOARD_SIZE + c] !== EMPTY_CELL) continue;
      // 檢查 2 格內有沒有石頭
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc) && state.board[nr * BOARD_SIZE + nc] !== EMPTY_CELL) {
            candidates.add(r * BOARD_SIZE + c);
            break;
          }
        }
        if (candidates.has(r * BOARD_SIZE + c)) break;
      }
    }
  }
  if (candidates.size === 0) {
    return [{ row: CENTER, col: CENTER }];
  }
  return Array.from(candidates).map((idx) => ({
    row: Math.floor(idx / BOARD_SIZE),
    col: idx % BOARD_SIZE,
  }));
}

/**
 * 評分一個 5 格線段：依「棋子數 + 兩端開放數」回傳形勢分數
 * 規則：衝突線段（一邊有我、一邊有敵）不計分
 */
function scoreLineOfFive(board: Board, cells: ReadonlyArray<[number, number]>): number {
  let ownCount = 0;
  let oppCount = 0;
  for (const [r, c] of cells) {
    const v = board[r * BOARD_SIZE + c];
    if (v === 'X') ownCount++;
    else if (v === 'O') oppCount++;
  }
  if (ownCount > 0 && oppCount > 0) return 0;
  if (ownCount === 0 && oppCount === 0) return 0;
  const isOwn = ownCount > 0;
  const count = isOwn ? ownCount : oppCount;
  // 兩端是否開放
  const first = cells[0];
  const last = cells[cells.length - 1];
  const beforeFirst = cellAt(board, first[0] - (cells[1][0] - first[0]), first[1] - (cells[1][1] - first[1]));
  const afterLast = cellAt(board, last[0] + (last[0] - cells[cells.length - 2][0]), last[1] + (last[1] - cells[cells.length - 2][1]));
  const openEnds =
    (beforeFirst === EMPTY_CELL ? 1 : 0) + (afterLast === EMPTY_CELL ? 1 : 0);

  if (count >= 5) return SCORES.WIN;
  if (count === 4) {
    if (openEnds === 2) return SCORES.OPEN_FOUR;
    if (openEnds === 1) return SCORES.CLOSED_FOUR;
    return 0;
  }
  if (count === 3) {
    if (openEnds === 2) return SCORES.OPEN_THREE;
    if (openEnds === 1) return SCORES.CLOSED_THREE;
    return 0;
  }
  if (count === 2) {
    if (openEnds === 2) return SCORES.OPEN_TWO;
    if (openEnds === 1) return SCORES.CLOSED_TWO;
    return 0;
  }
  if (count === 1) {
    if (openEnds === 2) return 5;
    if (openEnds === 1) return 1;
  }
  return 0;
}

/**
 * 評分整個局面：所有 5 格線段的形勢分數加總
 * 自身分數 - 對手分數 = 局面分數（越大對自身越有利）
 */
function evaluatePosition(board: Board, aiSymbol: 'X' | 'O'): number {
  let aiScore = 0;
  let oppSymbol: 'X' | 'O' = aiSymbol === 'X' ? 'O' : 'X';
  let oppScore = 0;
  // 對每個可能的 5 格線段起點 (row, col) 與 4 個方向
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (const [dr, dc] of FOUR_DIRECTIONS) {
        const endR = r + 4 * dr;
        const endC = c + 4 * dc;
        if (!inBounds(endR, endC)) continue;
        const cells: [number, number][] = [];
        for (let k = 0; k < 5; k++) {
          cells.push([r + k * dr, c + k * dc]);
        }
        // 判斷這個線段主要是誰的（給自己評分時，把自己的當 own，對手當 opp）
        let aiCount = 0;
        let oppCount = 0;
        for (const [cr, cc] of cells) {
          const v = board[cr * BOARD_SIZE + cc];
          if (v === aiSymbol) aiCount++;
          else if (v === oppSymbol) oppCount++;
        }
        if (aiCount > 0 && oppCount > 0) continue; // 衝突線段，不計分
        if (aiCount === 0 && oppCount === 0) continue;
        if (aiCount > 0) {
          // 暫時把 ai 當 own，opp 當空
          const fakeBoard: Board = board.map((v) => (v === oppSymbol ? EMPTY_CELL : v));
          aiScore += scoreLineOfFive(fakeBoard, cells);
        } else {
          // 暫時把 opp 當 own，ai 當空
          const fakeBoard: Board = board.map((v) => (v === aiSymbol ? EMPTY_CELL : v));
          oppScore += scoreLineOfFive(fakeBoard, cells);
        }
      }
    }
  }
  return aiScore - oppScore;
}

/**
 * 1-ply：試每個候選步，找讓自己分數最高的
 */
function pickMove1Ply(state: GomokuState, aiSymbol: 'X' | 'O'): Position | null {
  const candidates = getCandidateMoves(state);
  let bestScore = -Infinity;
  let bestMove: Position | null = null;
  for (const move of candidates) {
    const idx = move.row * BOARD_SIZE + move.col;
    const board = state.board.slice();
    board[idx] = aiSymbol;
    const score = evaluatePosition(board, aiSymbol);
    board[idx] = EMPTY_CELL;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

/**
 * 2-ply alpha-beta：自己下 → 對手選最差給自己 → 找自己 max(min(...))
 * 對每個候選步，呼叫 negamax，alpha-beta 剪枝
 */
function negamax(
  board: Board,
  aiSymbol: 'X' | 'O',
  depth: number,
  alpha: number,
  beta: number,
  isMaxPlayer: boolean,
): number {
  const playerSymbol: 'X' | 'O' = isMaxPlayer ? aiSymbol : aiSymbol === 'X' ? 'O' : 'X';
  if (depth === 0) {
    return evaluatePosition(board, aiSymbol);
  }
  const candidates = getCandidateMoves({
    board,
    nextSymbol: playerSymbol,
    moveCount: TOTAL_CELLS - board.filter((c) => c === EMPTY_CELL).length,
    lastMove: null,
    winnerLine: null,
    moves: [],
  });
  // Move ordering：先試分數高的（提升 alpha-beta 效率）
  const scored: Array<{ pos: Position; score: number }> = candidates.map((pos) => {
    const idx = pos.row * BOARD_SIZE + pos.col;
    board[idx] = playerSymbol;
    const score = evaluatePosition(board, aiSymbol);
    board[idx] = EMPTY_CELL;
    return { pos, score };
  });
  scored.sort((a, b) => (isMaxPlayer ? b.score - a.score : a.score - b.score));

  if (isMaxPlayer) {
    let value = -Infinity;
    for (const { pos } of scored) {
      const idx = pos.row * BOARD_SIZE + pos.col;
      board[idx] = playerSymbol;
      const childScore = negamax(board, aiSymbol, depth - 1, alpha, beta, false);
      board[idx] = EMPTY_CELL;
      value = Math.max(value, childScore);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const { pos } of scored) {
      const idx = pos.row * BOARD_SIZE + pos.col;
      board[idx] = playerSymbol;
      const childScore = negamax(board, aiSymbol, depth - 1, alpha, beta, true);
      board[idx] = EMPTY_CELL;
      value = Math.min(value, childScore);
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function pickMoveAlphaBeta(
  state: GomokuState,
  aiSymbol: 'X' | 'O',
  depth: number,
): Position | null {
  const candidates = getCandidateMoves(state);
  const board = state.board.slice();
  let bestScore = -Infinity;
  let bestMove: Position | null = null;
  for (const move of candidates) {
    const idx = move.row * BOARD_SIZE + move.col;
    board[idx] = aiSymbol;
    const score = negamax(board, aiSymbol, depth - 1, -Infinity, Infinity, false);
    board[idx] = EMPTY_CELL;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

export const gomokuAI: AIEngine<GomokuState, Position> = {
  gameType: 'gomoku',
  selectMove(state, aiSymbol, difficulty) {
    if (state.moveCount >= TOTAL_CELLS) return null;
    const candidates = getCandidateMoves(state);
    if (candidates.length === 0) return null;

    if (difficulty === 'easy') {
      // 70% 隨機 + 30% 用啟發式擋對手 4 連
      // 偵測：對手有沒有 4 連（且可堵）
      // 簡化：先試 1-ply 但只看對手威脅；找不到就隨機
      // 實作：找最大威脅的對手步，然後 70% 隨機或 30% 擋
      if (Math.random() < 0.3) {
        const blocking = findBlockingMove(state, aiSymbol);
        if (blocking) return blocking;
      }
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (difficulty === 'normal') {
      // 1-ply：純啟發式選最高分
      return pickMove1Ply(state, aiSymbol);
    }

    // hard：2-ply alpha-beta
    return pickMoveAlphaBeta(state, aiSymbol, 2);
  },
};

/**
 * 找「擋對手最關鍵的一步」（給簡單模式用）
 * 對手放這裡會形成 WIN / OPEN_FOUR / CLOSED_FOUR → 我們先放這裡擋
 */
function findBlockingMove(state: GomokuState, aiSymbol: 'X' | 'O'): Position | null {
  const oppSymbol: 'X' | 'O' = aiSymbol === 'X' ? 'O' : 'X';
  // 模擬：在每個候選步放對手，計算分數；找分數最高的那個，我們去擋
  const candidates = getCandidateMoves(state);
  let worstThreat: { pos: Position; score: number } | null = null;
  for (const move of candidates) {
    const idx = move.row * BOARD_SIZE + move.col;
    const board = state.board.slice();
    board[idx] = oppSymbol;
    const score = evaluatePosition(board, oppSymbol);
    board[idx] = EMPTY_CELL;
    if (!worstThreat || score > worstThreat.score) {
      worstThreat = { pos: move, score };
    }
  }
  // 只擋分數夠高的威脅（>= OPEN_FOUR）
  if (worstThreat && worstThreat.score >= SCORES.OPEN_FOUR) {
    return worstThreat.pos;
  }
  return null;
}

export const gomokuAITestHelpers = {
  getCandidateMoves,
  evaluatePosition,
  scoreLineOfFive,
  pickMove1Ply,
};
