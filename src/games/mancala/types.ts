/**
 * 播棋（Mancala / Kalah）狀態型別
 *
 * 規則（標準 Kalah 變體）：
 * - 2 排各 6 個 pit + 2 個 store
 * - 初始：每個 pit 4 顆石頭、store 0 顆
 * - 玩家輪流從自己一側的 pit 拿所有石頭
 * - 沿逆時針方向「播種」：每經過一個 pit/store 放 1 顆
 * - 跳過對手的 store
 * - 最後一顆落點：
 *   - 自己的 store → 額外一回合
 *   - 自己一側的空格 → 拿走該格 + 對側對應格的所有石頭，放進自己 store
 *   - 其他 → 換對手
 * - 一側完全清空 → 遊戲結束；對手拿走自己側剩下的所有石頭
 * - 比較 store 內石頭數，多者獲勝
 *
 * State 設計：
 * - pits[0] = X（玩家 0，上排）的 6 個 pit（pit 0 = 離 store 最遠）
 * - pits[1] = O（玩家 1，下排）的 6 個 pit
 * - stores: [X 的 store 數, O 的 store 數]
 * - currentTurn: 'X' | 'O'
 * - moveCount: 已下回合數
 * - lastMove: { side, pit } 最後一步（用於高亮）
 * - moves?: MoveRecord[] 棋譜
 *
 * 為什麼不存 boardAfter 為一維：pits 已經是 2D，序列化直接 flat
 *   [...pits[0], ...pits[1], stores[0], stores[1]] = 14 元素
 */

import type { MoveRecord } from '../../core/types/game';

export const PITS_PER_SIDE = 6;
export const INITIAL_STONES = 4;
export const TOTAL_PITS = PITS_PER_SIDE * 2; // 12
export const TOTAL_SLOTS = TOTAL_PITS + 2;    // 14（12 pit + 2 store）

export type Side = 0 | 1; // 0 = X, 1 = O

export interface MancalaState {
  pits: number[][]; // 2 sides, each with 6 pits
  stores: [number, number];
  currentTurn: 'X' | 'O';
  moveCount: number;
  lastMove: { side: Side; pit: number } | null;
  moves?: MoveRecord[];
}

export function createInitialState(): MancalaState {
  return {
    pits: [
      Array(PITS_PER_SIDE).fill(INITIAL_STONES),
      Array(PITS_PER_SIDE).fill(INITIAL_STONES),
    ],
    stores: [0, 0],
    currentTurn: 'X',
    moveCount: 0,
    lastMove: null,
    moves: [],
  };
}

export function isValidState(value: unknown): value is MancalaState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.pits) || v.pits.length !== 2) return false;
  for (let i = 0; i < 2; i++) {
    if (!Array.isArray(v.pits[i]) || (v.pits[i] as unknown[]).length !== PITS_PER_SIDE) return false;
    for (const n of v.pits[i] as number[]) {
      if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) return false;
    }
  }
  if (!Array.isArray(v.stores) || v.stores.length !== 2) return false;
  for (const n of v.stores) {
    if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) return false;
  }
  if (v.currentTurn !== 'X' && v.currentTurn !== 'O') return false;
  if (typeof v.moveCount !== 'number') return false;
  return true;
}

/** 取得某 side 的所有 pit（0 = X, 1 = O） */
export function getSidePits(state: MancalaState, side: Side): number[] {
  return state.pits[side];
}

/** 取得某 side 的對手 side */
export function opponentSide(side: Side): Side {
  return side === 0 ? 1 : 0;
}

/** 將 (side, pit) 轉成扁平索引（用於序列化） */
export function toFlatIndex(side: Side, pit: number): number {
  if (side === 0) return pit; // 0-5
  return PITS_PER_SIDE + pit; // 6-11
}
