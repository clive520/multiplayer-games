import { describe, it, expect } from 'vitest';
import { mancalaEngine } from './engine';
import { createInitialState, isValidState, type MancalaState } from './types';
import type { GameMove } from '../../core/types/game';

function applyMove(state: MancalaState, side: 0 | 1, pit: number): MancalaState {
  const move: GameMove = { playerId: 'test', payload: { side, pit }, timestamp: 0 };
  return mancalaEngine.applyMove(state, move) as MancalaState;
}

function xMove(state: MancalaState, pit: number): MancalaState {
  return applyMove(state, 0, pit);
}
function oMove(state: MancalaState, pit: number): MancalaState {
  return applyMove(state, 1, pit);
}

describe('mancala engine', () => {
  it('createInitialState：2 排 6 pit + 2 store，每 pit 4 石頭', () => {
    const s = createInitialState();
    expect(s.pits.length).toBe(2);
    expect(s.pits[0].length).toBe(6);
    expect(s.pits[1].length).toBe(6);
    expect(s.pits[0].every((n) => n === 4)).toBe(true);
    expect(s.pits[1].every((n) => n === 4)).toBe(true);
    expect(s.stores).toEqual([0, 0]);
    expect(s.currentTurn).toBe('X');
    expect(s.moveCount).toBe(0);
  });

  it('isValidState：合法初始 state 通過', () => {
    expect(isValidState(createInitialState())).toBe(true);
  });

  it('isValidState：null 與非物件失敗', () => {
    expect(isValidState(null)).toBe(false);
    expect(isValidState({})).toBe(false);
    expect(isValidState({ pits: [[]], stores: [0, 0], currentTurn: 'X', moveCount: 0 })).toBe(false);
  });

  it('validateMove：選自己的空格 → false', () => {
    let s = createInitialState();
    s = xMove(s, 0); // X 從 pit 0 拿 4 顆
    // 假設現在換 O：X 試圖下但 currentTurn 是 O
    const move: GameMove = { playerId: 'p', payload: { side: 0, pit: 1 }, timestamp: 0 };
    expect(mancalaEngine.validateMove(s, move)).toBe(false);
  });

  it('validateMove：選對手的 pit → false', () => {
    const s = createInitialState();
    const move: GameMove = { playerId: 'p', payload: { side: 1, pit: 0 }, timestamp: 0 };
    expect(mancalaEngine.validateMove(s, move)).toBe(false);
  });

  it('validateMove：選自己一側沒石頭的 pit → false', () => {
    const s = createInitialState();
    s.pits[0][0] = 0; // 手動清空
    const move: GameMove = { playerId: 'p', payload: { side: 0, pit: 0 }, timestamp: 0 };
    expect(mancalaEngine.validateMove(s, move)).toBe(false);
  });

  it('X 從 pit 0 拿 4 顆：依序播到 pit 1, 2, 3, 4（X 一側逆時針）', () => {
    let s = createInitialState();
    s = xMove(s, 0);
    // pit 0 → 0
    expect(s.pits[0][0]).toBe(0);
    // 播種到 pit 1, 2, 3, 4（+1 顆 each）
    expect(s.pits[0][1]).toBe(5);
    expect(s.pits[0][2]).toBe(5);
    expect(s.pits[0][3]).toBe(5);
    expect(s.pits[0][4]).toBe(5);
    // pit 5 沒被播到
    expect(s.pits[0][5]).toBe(4);
    // O 側都沒被動
    expect(s.pits[1].every((n) => n === 4)).toBe(true);
    // 換 O
    expect(s.currentTurn).toBe('O');
  });

  it('X 從 pit 3 拿 3 顆：播到 pit 4, 5, S0（最後一顆在 S0）→ 額外回合', () => {
    let s = createInitialState();
    s.pits[0][3] = 3; // 只要 3 顆才能最後一顆剛好落 S0
    s = xMove(s, 3);
    expect(s.pits[0][3]).toBe(0);
    expect(s.pits[0][4]).toBe(5);
    expect(s.pits[0][5]).toBe(5);
    expect(s.stores[0]).toBe(1);
    // 額外回合 → 還是 X
    expect(s.currentTurn).toBe('X');
  });

  it('X 從 pit 5 拿 4 顆：S0, O pit 0, 1, 2 → 沒額外回合', () => {
    let s = createInitialState();
    s = xMove(s, 5);
    expect(s.stores[0]).toBe(1);
    expect(s.pits[1][0]).toBe(5);
    expect(s.pits[1][1]).toBe(5);
    expect(s.pits[1][2]).toBe(5);
    // 沒播到 S1（跳過）
    expect(s.stores[1]).toBe(0);
    // 沒播到 O pit 3, 4, 5
    expect(s.pits[1][3]).toBe(4);
    expect(s.pits[1][4]).toBe(4);
    expect(s.pits[1][5]).toBe(4);
    // 換 O
    expect(s.currentTurn).toBe('O');
  });

  it('捕子：X 播種後最後一顆落到自己空格，捕對側對應 pit', () => {
    // 構造：X 從 pit 0 拿 3 顆，播到 pit 1, 2, 3（最後一顆落 pit 3）
    //   播種前 pit 3 為 0 → 觸發捕子
    //   對側對應 pit = pits[1][5-3] = pits[1][2]
    let s = createInitialState();
    s.pits[0][0] = 3; // 3 顆
    s.pits[0][1] = 0;
    s.pits[0][2] = 0;
    s.pits[0][3] = 0; // 空格（播到會觸發捕子）
    s.pits[1][2] = 5; // 對側對應 pit 2 有 5 顆
    s = xMove(s, 0);
    // pit 3 從 0 變 1 → 捕
    expect(s.pits[0][3]).toBe(0); // 自己 pit 被清空
    expect(s.pits[1][2]).toBe(0); // 對側對應 pit 被清空
    // S0 收 1（自己的）+ 5（對側的）= 6
    expect(s.stores[0]).toBe(6);
  });

  it('X 播種 S0 跳過 S1 不放石頭', () => {
    // 構造：X 從 pit 5 拿 12 顆，會繞一圈到 S1 但跳過
    let s = createInitialState();
    s.pits[0][5] = 12; // 12 顆
    // 播種：S0 (1), O pit 0 (2), 1 (3), 2 (4), 3 (5), 4 (6), 5 (7) [S1 跳過] X pit 0 (8), 1 (9), 2 (10), 3 (11), 4 (12)
    s = xMove(s, 5);
    // 最後一顆落到 pit 4 → X 側、非空格（變 5）、不觸發捕
    expect(s.pits[0][4]).toBe(5);
    // S0 只有 1 顆（沒繞回來）
    expect(s.stores[0]).toBe(1);
    // S1 完全沒動
    expect(s.stores[1]).toBe(0);
  });

  it('checkResult：某側全空 → 遊戲結束，store 多者勝', () => {
    let s = createInitialState();
    s.pits[0] = [0, 0, 0, 0, 0, 0]; // X 側全空
    s.stores = [20, 15];
    // 不需要 applyMove，直接 checkResult
    const result = mancalaEngine.checkResult(s, [
      { uid: 'x', symbol: 'X' },
      { uid: 'o', symbol: 'O' },
    ]);
    expect(result.finished).toBe(true);
    expect(result.winnerId).toBe('x');
  });

  it('checkResult：平局', () => {
    let s = createInitialState();
    s.pits[0] = [0, 0, 0, 0, 0, 0];
    s.stores = [20, 20];
    const result = mancalaEngine.checkResult(s, [
      { uid: 'x', symbol: 'X' },
      { uid: 'o', symbol: 'O' },
    ]);
    expect(result.finished).toBe(true);
    expect(result.isDraw).toBe(true);
  });

  it('checkResult：雙側都還有石頭 → 遊戲未結束', () => {
    const s = createInitialState();
    const result = mancalaEngine.checkResult(s, [
      { uid: 'x', symbol: 'X' },
      { uid: 'o', symbol: 'O' },
    ]);
    expect(result.finished).toBe(false);
  });

  it('X 從 pit 0 拿 1 顆：播種到 pit 1，O 換手', () => {
    let s = createInitialState();
    s.pits[0][0] = 1;
    s = xMove(s, 0);
    expect(s.pits[0][0]).toBe(0);
    expect(s.pits[0][1]).toBe(5);
    expect(s.currentTurn).toBe('O');
  });

  it('O 從自己 pit 0 拿 4 顆：播種到 O pit 1, 2, 3, 4', () => {
    // 手動構造 state：currentTurn = O、pits 全是 4（避免 X 動過的副作用）
    const s: MancalaState = {
      ...createInitialState(),
      currentTurn: 'O',
    };
    const next = oMove(s, 0);
    expect(next.pits[1][0]).toBe(0);
    expect(next.pits[1][1]).toBe(5);
    expect(next.pits[1][2]).toBe(5);
    expect(next.pits[1][3]).toBe(5);
    expect(next.pits[1][4]).toBe(5);
    expect(next.pits[1][5]).toBe(4); // 沒播到
    expect(next.currentTurn).toBe('X');
  });

  it('O 從 pit 3 拿 3 顆：播到 O pit 4, 5, S1（最後一顆在 S1）→ 額外回合', () => {
    const s: MancalaState = {
      ...createInitialState(),
      currentTurn: 'O',
    };
    s.pits[1][3] = 3; // 只要 3 顆，最後一顆才落 S1
    const next = oMove(s, 3);
    expect(next.pits[1][3]).toBe(0);
    expect(next.pits[1][4]).toBe(5);
    expect(next.pits[1][5]).toBe(5);
    expect(next.stores[1]).toBe(1);
    // 額外回合 → 還是 O
    expect(next.currentTurn).toBe('O');
  });
});
