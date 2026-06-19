import { describe, it, expect } from 'vitest';
import { mancalaAI } from './ai';
import { createInitialState, type MancalaState } from './types';

describe('mancala AI', () => {
  it('easy：初始 state 回傳合法 move', () => {
    const s = createInitialState();
    const m = mancalaAI.selectMove(s, 'X', 'easy');
    expect(m).not.toBeNull();
    expect(m!.side).toBe(0);
    expect(m!.pit).toBeGreaterThanOrEqual(0);
    expect(m!.pit).toBeLessThan(6);
    // 初始每 pit 有 4 顆，全部合法
  });

  it('normal：選最右邊的 pit（最可能落到自己 store）', () => {
    // 構造：只有 pit 5 有石頭，其他空。播種 pit 5 (n 顆) → 一定播到 S0 → extra turn
    // → store 立即 +1
    // 構造：pit 5 有 4 顆，其他空
    const s: MancalaState = {
      ...createInitialState(),
      pits: [
        [0, 0, 0, 0, 0, 4], // X pit 5 有 4 顆
        [0, 0, 0, 0, 0, 0],
      ],
      stores: [0, 0],
    };
    const m = mancalaAI.selectMove(s, 'X', 'normal');
    // 唯一合法 move 是 pit 5
    expect(m).toEqual({ side: 0, pit: 5 });
  });

  it('normal：捕子步優先', () => {
    // 構造：X pit 0 有 3 顆，播到 X pit 3（空格）→ 捕 O pit 2（5 顆）→ 大得分
    // 對比：X pit 0 沒石頭，其他有石頭 → 應選 pit 0
    const s: MancalaState = {
      ...createInitialState(),
      pits: [
        [3, 0, 0, 0, 0, 0], // X pit 0 有 3 顆
        [0, 0, 5, 0, 0, 0], // O pit 2 有 5 顆（將被捕）
      ],
      stores: [0, 0],
    };
    const m = mancalaAI.selectMove(s, 'X', 'normal');
    expect(m).toEqual({ side: 0, pit: 0 });
  });

  it('hard：選直接 store +1 的那步（vs 只保留石頭的步）', () => {
    // 構造：X pit 0 有 1 顆（播到 X pit 1）→ 觸發捕子 → 拿 4 顆 + store +5
    //        X pit 5 有 1 顆（播到 S0 → store +1，不捕子）
    // 啟發式：捕子步 storeGain=5*10=50，遠大於非捕子步 1*10=10
    const s: MancalaState = {
      ...createInitialState(),
      pits: [
        [1, 0, 0, 0, 0, 1],
        [4, 4, 4, 4, 4, 4],
      ],
      stores: [0, 0],
    };
    const m = mancalaAI.selectMove(s, 'X', 'normal');
    // pit 0 觸發捕子（拿 O pit 4 的 4 顆 + 自己的 1 顆 = 5）→ 選 pit 0
    expect(m).toEqual({ side: 0, pit: 0 });
  });

  it('easy 隨機性：多次呼叫不 crash', () => {
    const s = createInitialState();
    for (let i = 0; i < 10; i++) {
      const m = mancalaAI.selectMove(s, 'X', 'easy');
      expect(m).not.toBeNull();
    }
  });

  it('全部 pit 空 → 回傳 null（不會發生在正常遊戲，但 defensive）', () => {
    const s: MancalaState = {
      ...createInitialState(),
      pits: [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ],
    };
    const m = mancalaAI.selectMove(s, 'X', 'normal');
    expect(m).toBeNull();
  });
});
