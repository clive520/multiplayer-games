import { describe, it, expect } from 'vitest';
import { dotsAndBoxesEngine } from './engine';
import {
  createInitialState,
  isValidState,
  BOX_ROWS,
  BOX_COLS,
  type DotsAndBoxesState,
} from './types';

function applyEdge(
  state: DotsAndBoxesState,
  type: 'h' | 'v',
  row: number,
  col: number,
): DotsAndBoxesState {
  return dotsAndBoxesEngine.applyMove(state, {
    playerId: 'p',
    payload: { type, row, col },
    timestamp: 0,
  });
}

describe('dotsandboxes engine', () => {
  it('createInitialState：4×4 方格 = 16 格，全空，X 先手', () => {
    const s = createInitialState();
    expect(s.hEdges.length).toBe(BOX_ROWS + 1); // 5
    expect(s.hEdges[0].length).toBe(BOX_COLS);    // 4
    expect(s.vEdges.length).toBe(BOX_ROWS);        // 4
    expect(s.vEdges[0].length).toBe(BOX_COLS + 1); // 5
    expect(s.boxOwners.length).toBe(BOX_ROWS);
    expect(s.boxOwners[0].length).toBe(BOX_COLS);
    // 全空字串
    expect(s.hEdges.flat().every((c) => c === '')).toBe(true);
    expect(s.vEdges.flat().every((c) => c === '')).toBe(true);
    expect(s.boxOwners.flat().every((c) => c === '')).toBe(true);
    expect(s.currentTurn).toBe('X');
    expect(s.moveCount).toBe(0);
    expect(s.scores).toEqual({ X: 0, O: 0 });
  });

  it('isValidState 接受合法 / 拒絕非 state', () => {
    expect(isValidState(createInitialState())).toBe(true);
    expect(isValidState({})).toBe(false);
    expect(isValidState(null)).toBe(false);
    expect(isValidState({ hEdges: [], vEdges: [], boxOwners: [], currentTurn: 'X', moveCount: 0 })).toBe(false);
  });

  it('畫一條水平邊：H 邊設值，moveCount+1，切換到 O', () => {
    let s = createInitialState();
    s = applyEdge(s, 'h', 0, 0);
    expect(s.hEdges[0][0]).toBe('X');
    expect(s.currentTurn).toBe('O');
    expect(s.moveCount).toBe(1);
    expect(s.lastMove).toEqual({ type: 'h', row: 0, col: 0 });
  });

  it('畫一條垂直邊：V 邊設值', () => {
    let s = createInitialState();
    s = applyEdge(s, 'v', 0, 0);
    // 初始 X 先手，畫的邊歸 X
    expect(s.vEdges[0][0]).toBe('X');
    expect(s.currentTurn).toBe('O'); // 切到 O
  });

  it('畫已畫的邊：validateMove false', () => {
    let s = createInitialState();
    s = applyEdge(s, 'h', 0, 0);
    expect(
      dotsAndBoxesEngine.validateMove(s, { playerId: 'p', payload: { type: 'h', row: 0, col: 0 }, timestamp: 0 })
    ).toBe(false);
  });

  it('超出範圍：validateMove false', () => {
    const s = createInitialState();
    expect(
      dotsAndBoxesEngine.validateMove(s, { playerId: 'p', payload: { type: 'h', row: -1, col: 0 }, timestamp: 0 })
    ).toBe(false);
    expect(
      dotsAndBoxesEngine.validateMove(s, { playerId: 'p', payload: { type: 'h', row: 5, col: 0 }, timestamp: 0 })
    ).toBe(false);
    expect(
      dotsAndBoxesEngine.validateMove(s, { playerId: 'p', payload: { type: 'h', row: 0, col: 4 }, timestamp: 0 })
    ).toBe(false);
    expect(
      dotsAndBoxesEngine.validateMove(s, { playerId: 'p', payload: { type: 'v', row: 4, col: 0 }, timestamp: 0 })
    ).toBe(false);
  });

  describe('完成方格 → 額外回合', () => {
    it('完成一個方格：score+1，下一手仍是同玩家', () => {
      // 在 (0,0) 方格畫 3 條邊（X 畫），然後 O 畫第 4 條完成
      let s = createInitialState();
      s = applyEdge(s, 'h', 0, 0); // X 上邊
      s = applyEdge(s, 'h', 1, 0); // O 下邊
      s = applyEdge(s, 'v', 0, 0); // X 左邊
      s = applyEdge(s, 'v', 0, 1); // O 右邊 → 完成
      expect(s.boxOwners[0][0]).toBe('O');
      expect(s.scores).toEqual({ X: 0, O: 1 });
      expect(s.currentTurn).toBe('O'); // 額外回合，仍是 O
    });

    it('一次畫邊完成 2 個方格：score+2，玩家同樣保留', () => {
      // 構造：vEdges[0][1] 一次封住 (0,0) 和 (0,1) 兩個方格
      //   (0,0) 需要 h[0][0]、h[1][0]、v[0][0]、v[0][1]
      //   (0,1) 需要 h[0][1]、h[1][1]、v[0][1]、v[0][2]
      // X 畫 3 邊、O 畫 3 邊，最後 X 畫 v[0][1] 完成 2 個
      let s = createInitialState();
      s = applyEdge(s, 'h', 0, 0); // X
      s = applyEdge(s, 'h', 1, 0); // O
      s = applyEdge(s, 'v', 0, 0); // X
      s = applyEdge(s, 'h', 0, 1); // O
      s = applyEdge(s, 'h', 1, 1); // X
      s = applyEdge(s, 'v', 0, 2); // O
      // 現在 (0,0) 差 v[0][1]、(0,1) 差 v[0][1] → 一起封
      s = applyEdge(s, 'v', 0, 1); // X
      expect(s.boxOwners[0][0]).toBe('X');
      expect(s.boxOwners[0][1]).toBe('X');
      expect(s.scores).toEqual({ X: 2, O: 0 });
      expect(s.currentTurn).toBe('X'); // 額外回合，仍是 X
    });
  });

  describe('checkResult', () => {
    it('moveCount < 16 → 未結束', () => {
      const s = createInitialState();
      const r = dotsAndBoxesEngine.checkResult(s, [
        { uid: 'p1', symbol: 'X' },
        { uid: 'p2', symbol: 'O' },
      ]);
      expect(r.finished).toBe(false);
    });

    it('X 全拿：X 贏', () => {
      const s: DotsAndBoxesState = {
        ...createInitialState(),
        scores: { X: 16, O: 0 },
        moveCount: 16,
      };
      const r = dotsAndBoxesEngine.checkResult(s, [
        { uid: 'p1', symbol: 'X' },
        { uid: 'p2', symbol: 'O' },
      ]);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('平手', () => {
      const s: DotsAndBoxesState = {
        ...createInitialState(),
        scores: { X: 8, O: 8 },
        moveCount: 16,
      };
      const r = dotsAndBoxesEngine.checkResult(s, [
        { uid: 'p1', symbol: 'X' },
        { uid: 'p2', symbol: 'O' },
      ]);
      expect(r.finished).toBe(true);
      expect(r.isDraw).toBe(true);
    });

    it('O 贏', () => {
      const s: DotsAndBoxesState = {
        ...createInitialState(),
        scores: { X: 5, O: 11 },
        moveCount: 16,
      };
      const r = dotsAndBoxesEngine.checkResult(s, [
        { uid: 'p1', symbol: 'X' },
        { uid: 'p2', symbol: 'O' },
      ]);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p2');
    });
  });
});
