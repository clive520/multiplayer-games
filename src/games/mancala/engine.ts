import type { GameEngine, GameResult } from '../../core/types/game';
import {
  PITS_PER_SIDE,
  TOTAL_SLOTS,
  type MancalaState,
  type Side,
  createInitialState,
  isValidState,
  opponentSide,
} from './types';

/**
 * 播棋 Mancala 引擎（Kalah 變體）
 *
 * 規則複習（標準 Kalah）：
 * - 2 排 6 個 pit + 2 個 store，初始每 pit 4 顆石頭
 * - 玩家輪流從自己一側的 pit 拿所有石頭，沿播種順序撒
 * - 播種順序：X pits[0..5] → S0 → O pits[0..5] → S1 → 回到 X pits[0]
 * - 跳過對手的 store（X 播種時跳過 S1，O 播種時跳過 S0）
 * - 最後一顆落點：
 *   - 自己 store → 額外一回合
 *   - 自己一側空格（播種前為 0）→ 捕子：自己 pit 那 1 顆 + 對側對應 pit 全拿 → 自己 store
 *   - 其他 → 換對手
 * - 一側完全清空 → 遊戲結束，對手拿自己側剩餘所有石頭 → 比較 store，多者勝
 */

function symbolToSide(symbol: 'X' | 'O'): Side {
  return symbol === 'X' ? 0 : 1;
}

/**
 * 從 (side, pit) 開始播種
 *
 * 播種座標系（14 個位置，環狀）：
 *   pos 0..5   = X 的 pit 0..5
 *   pos 6      = S0 (X 的 store)
 *   pos 7..12  = O 的 pit 0..5
 *   pos 13     = S1 (O 的 store)
 */
function sow(
  pits: number[][],
  stores: [number, number],
  startSide: Side,
  startPit: number,
): {
  pits: number[][];
  stores: [number, number];
  lastWasStore: boolean;
  lastSide: Side | null;
  lastPit: number | null;
  extraTurn: boolean;
  captured: boolean;
} {
  let stones = pits[startSide][startPit];
  pits[startSide][startPit] = 0;

  // 播種起點 pos
  let pos = startSide === 0 ? startPit : 7 + startPit;
  // X 播種跳過 S1 (pos 13)，O 播種跳過 S0 (pos 6)
  const skipStorePos = startSide === 0 ? 13 : 6;

  let lastWasStore = false;
  let lastSide: Side | null = null;
  let lastPit: number | null = null;

  for (let i = 0; i < stones; i++) {
    pos = (pos + 1) % TOTAL_SLOTS;
    if (pos === skipStorePos) {
      // 對手的 store → 跳過，不放石頭
      pos = (pos + 1) % TOTAL_SLOTS;
    }
    if (pos === 6) {
      stores[0]++;
      lastWasStore = true;
      lastSide = 0;
      lastPit = null;
    } else if (pos === 13) {
      stores[1]++;
      lastWasStore = true;
      lastSide = 1;
      lastPit = null;
    } else if (pos >= 0 && pos <= 5) {
      pits[0][pos]++;
      lastWasStore = false;
      lastSide = 0;
      lastPit = pos;
    } else {
      // pos 7..12 → O pit 0..5
      const oPit = pos - 7;
      pits[1][oPit]++;
      lastWasStore = false;
      lastSide = 1;
      lastPit = oPit;
    }
  }

  // 判定額外回合 / 捕子
  let extraTurn = false;
  let captured = false;

  if (lastWasStore && lastSide === startSide) {
    // 最後一顆在自己 store → 額外一回合
    extraTurn = true;
  } else if (!lastWasStore && lastSide === startSide && lastPit !== null) {
    // 最後一顆在自己 pit，且播種前是空的（播種後變 1）→ 捕子
    if (pits[startSide][lastPit] === 1) {
      const oppSide = opponentSide(startSide);
      const oppPit = PITS_PER_SIDE - 1 - lastPit; // 對側對應 pit（鏡像）
      const oppStones = pits[oppSide][oppPit];
      const myStones = pits[startSide][lastPit];
      pits[oppSide][oppPit] = 0;
      pits[startSide][lastPit] = 0;
      stores[startSide] += oppStones + myStones;
      captured = true;
    }
  }

  return { pits, stores, lastWasStore, lastSide, lastPit, extraTurn, captured };
}

/** 遊戲是否結束（某一側全空） */
function isSideEmpty(pits: number[][], side: Side): boolean {
  return pits[side].every((n) => n === 0);
}

export const mancalaEngine: GameEngine<MancalaState> = {
  id: 'mancala',
  name: '播棋',
  minPlayers: 2,
  maxPlayers: 2,
  description: `兩人在 ${PITS_PER_SIDE * 2} 個 pit + 2 個 store 的棋盤上輪流播種，store 內石頭多者獲勝。`,
  initialSymbolPool: ['X', 'O'],

  getInitialState: () => createInitialState(),

  validateMove(state, move) {
    const payload = move.payload as { side?: number; pit?: number };
    if (typeof payload?.side !== 'number' || typeof payload?.pit !== 'number') return false;
    if (payload.side !== 0 && payload.side !== 1) return false;
    if (!Number.isInteger(payload.pit) || payload.pit < 0 || payload.pit >= PITS_PER_SIDE) return false;
    if (payload.side !== symbolToSide(state.currentTurn)) return false;
    if (state.pits[payload.side][payload.pit] === 0) return false;
    return true;
  },

  applyMove(state, move) {
    const payload = move.payload as { side: 0 | 1; pit: number };
    // 深拷貝
    const pits: number[][] = [
      [...state.pits[0]],
      [...state.pits[1]],
    ];
    const stores: [number, number] = [state.stores[0], state.stores[1]];

    const result = sow(pits, stores, payload.side, payload.pit);

    // 遊戲結束檢查
    if (isSideEmpty(pits, 0) || isSideEmpty(pits, 1)) {
      // 遊戲結束：把對手側剩餘石頭收進對手 store
      const otherSide: Side = isSideEmpty(pits, 0) ? 1 : 0;
      const remaining = pits[otherSide].reduce((a, b) => a + b, 0);
      stores[otherSide] += remaining;
      pits[otherSide] = Array(PITS_PER_SIDE).fill(0);
    }

    const nextTurn: 'X' | 'O' = result.extraTurn
      ? state.currentTurn
      : (state.currentTurn === 'X' ? 'O' : 'X');

    return {
      pits,
      stores,
      currentTurn: nextTurn,
      moveCount: state.moveCount + 1,
      lastMove: { side: payload.side, pit: payload.pit },
    };
  },

  checkResult(state, players): GameResult {
    // 遊戲結束條件：某一側全空（不論是播種後清空，或初始就空）
    if (isSideEmpty(state.pits, 0) || isSideEmpty(state.pits, 1)) {
      if (state.stores[0] > state.stores[1]) {
        const winner = players.find((p) => p.symbol === 'X');
        return { finished: true, winnerId: winner?.uid };
      }
      if (state.stores[1] > state.stores[0]) {
        const winner = players.find((p) => p.symbol === 'O');
        return { finished: true, winnerId: winner?.uid };
      }
      return { finished: true, isDraw: true };
    }
    return { finished: false };
  },
};

export { isValidState };
