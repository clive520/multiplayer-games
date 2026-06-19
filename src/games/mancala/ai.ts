import type { AIEngine } from '../../core/types/ai';
import { mancalaEngine } from './engine';
import {
  PITS_PER_SIDE,
  type MancalaState,
} from './types';

type Move = { side: 0 | 1; pit: number };

/**
 * 播棋 AI 引擎（IMPROVEMENTS #9 擴充）
 *
 * 難度分級：
 * - easy：完全隨機（不考慮捕子 / store）
 * - normal：1-ply 啟發式（捕子 / store / 偏左 pit）
 * - hard：normal + 估計對手「最差反應」（簡化 minimax）
 *
 * 注意：播棋是公認的「看似簡單、其實很深」的遊戲。完整 minimax 4-ply 就能
 * 打贏業餘玩家，但這裡用 1-ply 啟發式是 MVP 範圍。之後可升級。
 */

function getValidMoves(state: MancalaState, side: 0 | 1): Move[] {
  const moves: Move[] = [];
  for (let p = 0; p < PITS_PER_SIDE; p++) {
    if (state.pits[side][p] > 0) {
      moves.push({ side, pit: p });
    }
  }
  return moves;
}

/** 模擬某步的結果（不修改 state） */
function simulateMove(state: MancalaState, move: Move): MancalaState {
  return mancalaEngine.applyMove(state, {
    playerId: 'ai',
    payload: move,
    timestamp: 0,
  }) as MancalaState;
}

/** 啟發式評分（越高越好） */
function scoreMove(state: MancalaState, move: Move): number {
  const next = simulateMove(state, move);
  let score = 0;

  // 1. 自己 store 增加的數量（最直接得分）
  const storeGain = next.stores[move.side] - state.stores[move.side];
  score += storeGain * 10;

  // 2. 自己一側剩餘石頭數（多 = 越多播種機會 = 越多得分）
  const myStones = next.pits[move.side].reduce((a, b) => a + b, 0);
  score += myStones * 0.5;

  // 3. 對手 store 增加量（負向：越少越好）
  const oppStones = next.stores[1 - move.side] - state.stores[1 - move.side];
  score -= oppStones * 8;

  // 4. 對手一側剩餘石頭（負向：越少越好）
  const oppSideStones = next.pits[1 - move.side].reduce((a, b) => a + b, 0);
  score -= oppSideStones * 0.5;

  return score;
}

function pickBest(state: MancalaState, side: 0 | 1, lookAhead: 1 | 2): Move | null {
  const valid = getValidMoves(state, side);
  if (valid.length === 0) return null;

  if (lookAhead === 1) {
    let best = valid[0];
    let bestScore = -Infinity;
    for (const m of valid) {
      const s = scoreMove(state, m);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

  // 2-ply：自己這步 + 對手「最壞反應」分數（minimax 簡化）
  let best = valid[0];
  let bestScore = -Infinity;
  for (const myMove of valid) {
    const myNext = simulateMove(state, myMove);
    const myScore = scoreMove(state, myMove);

    // 模擬對手下一步：選對手最高分（對我來說最壞）
    const oppMoves = getValidMoves(myNext, (1 - side) as 0 | 1);
    let worstOppScore = Infinity;
    for (const oppMove of oppMoves) {
      const oppS = scoreMove(myNext, oppMove);
      if (oppS < worstOppScore) worstOppScore = oppS;
    }
    const total = myScore - (worstOppScore === Infinity ? 0 : worstOppScore);
    if (total > bestScore) {
      bestScore = total;
      best = myMove;
    }
  }
  return best;
}

export const mancalaAI: AIEngine<MancalaState, Move> = {
  gameType: 'mancala',
  selectMove(state, symbol, difficulty) {
    const side: 0 | 1 = symbol === 'X' ? 0 : 1;
    if (difficulty === 'easy') {
      const moves = getValidMoves(state, side);
      if (moves.length === 0) return null;
      return moves[Math.floor(Math.random() * moves.length)];
    }
    if (difficulty === 'normal') {
      return pickBest(state, side, 1);
    }
    return pickBest(state, side, 2);
  },
};
