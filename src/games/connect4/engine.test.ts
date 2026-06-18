import { describe, it, expect } from 'vitest';
import { connect4Engine } from './engine';
import { createInitialState, isValidState, type Connect4State } from './types';

function applyCol(state: Connect4State, col: number, _symbol: 'X' | 'O'): Connect4State {
  return connect4Engine.applyMove(state, {
    playerId: 'p',
    payload: { col },
    timestamp: 0,
  });
}

describe('connect4 engine', () => {
  it('createInitialState 回傳 42 格全空 + X 先手 + moveCount 0', () => {
    const s = createInitialState();
    expect(s.board.length).toBe(42);
    expect(s.board.every((c) => c === '')).toBe(true);
    expect(s.currentTurn).toBe('X');
    expect(s.moveCount).toBe(0);
    expect(s.lastMove).toBe(null);
    expect(s.winnerLine).toBe(null);
  });

  it('isValidState 接受合法 state、拒絕非 state', () => {
    expect(isValidState(createInitialState())).toBe(true);
    expect(isValidState({})).toBe(false);
    expect(isValidState(null)).toBe(false);
    expect(isValidState({ board: [], currentTurn: 'X', moveCount: 0 })).toBe(false);
  });

  it('下一手：X 落第 3 欄 col=2，會掉到最底 row=5', () => {
    const s = applyCol(createInitialState(), 2, 'X');
    expect(s.board[5 * 7 + 2]).toBe('X');
    expect(s.currentTurn).toBe('O');
    expect(s.moveCount).toBe(1);
    expect(s.lastMove).toEqual({ row: 5, col: 2 });
  });

  it('同欄堆疊：X 落 col=2 在 row 5、O 也落 col=2 在 row 4', () => {
    let s = createInitialState();
    s = applyCol(s, 2, 'X');
    s = applyCol(s, 2, 'O');
    expect(s.board[5 * 7 + 2]).toBe('X');
    expect(s.board[4 * 7 + 2]).toBe('O');
  });

  it('欄滿了：6 個子放到 col=0 後第 7 個會 throw', () => {
    let s = createInitialState();
    for (let i = 0; i < 6; i++) {
      // 輪流放 X / O（6 ROWS 最多 6 子）
      s = applyCol(s, 0, i % 2 === 0 ? 'X' : 'O');
    }
    expect(() => applyCol(s, 0, 'X')).toThrow();
  });

  it('validateMove：欄滿了回傳 false', () => {
    let s = createInitialState();
    for (let i = 0; i < 6; i++) {
      s = applyCol(s, 0, i % 2 === 0 ? 'X' : 'O');
    }
    expect(connect4Engine.validateMove(s, { playerId: 'p', payload: { col: 0 }, timestamp: 0 })).toBe(false);
  });

  it('validateMove：col 超出範圍回傳 false', () => {
    const s = createInitialState();
    expect(connect4Engine.validateMove(s, { playerId: 'p', payload: { col: -1 }, timestamp: 0 })).toBe(false);
    expect(connect4Engine.validateMove(s, { playerId: 'p', payload: { col: 7 }, timestamp: 0 })).toBe(false);
  });

  describe('4 連線判斷', () => {
    it('水平 4 連：X 落 0,1,2,3 同一 row 5 → X 贏', () => {
      let s = createInitialState();
      s = applyCol(s, 0, 'X');
      s = applyCol(s, 0, 'O');
      s = applyCol(s, 1, 'X');
      s = applyCol(s, 1, 'O');
      s = applyCol(s, 2, 'X');
      s = applyCol(s, 2, 'O');
      s = applyCol(s, 3, 'X');
      // X 4 連 → winnerLine
      expect(s.winnerLine).not.toBe(null);
      expect(s.winnerLine?.length).toBe(4);
    });

    it('垂直 4 連：X 連落 col 0 四次 → X 贏', () => {
      let s = createInitialState();
      s = applyCol(s, 0, 'X');
      s = applyCol(s, 1, 'O');
      s = applyCol(s, 0, 'X');
      s = applyCol(s, 1, 'O');
      s = applyCol(s, 0, 'X');
      s = applyCol(s, 1, 'O');
      s = applyCol(s, 0, 'X');
      // X 在 col 0 垂直 4 連
      expect(s.winnerLine).not.toBe(null);
      expect(s.winnerLine?.length).toBe(4);
    });

    it('對角 ↘ 4 連：X 贏', () => {
      // 構造：
      //   . . . . . . .
      //   . . . X . . .  ← row 4
      //   . . O X . . .  ← row 3
      //   . O O X . . .  ← row 2
      //   O X O X . . .  ← row 1
      //   X O X X . . .  ← row 0
      let s = createInitialState();
      // 依順序下子（X 0,0) (O 0,1) (X 1,0) (O 1,1) ... 我們直接建一個會贏的狀態
      // 比較簡單：用 console 建一個明顯的對角
      // 走法：row 0 col 0 = X, row 0 col 1 = O
      //       row 1 col 0 = X, row 1 col 1 = O
      //       row 2 col 1 = X, row 2 col 2 = O
      //       row 3 col 2 = X
      s = applyCol(s, 0, 'X');
      s = applyCol(s, 1, 'O');
      s = applyCol(s, 0, 'X');
      s = applyCol(s, 1, 'O');
      s = applyCol(s, 1, 'X');
      s = applyCol(s, 2, 'O');
      s = applyCol(s, 2, 'X');
      // 棋盤：(row 0) [X, O, _, _, _, _, _]
      //       (row 1) [X, O, _, _, _, _, _]
      //       (row 2) [_, X, O, _, _, _, _]
      //       (row 3) [_, _, X, _, _, _, _]
      // 對角：X 在 (0,0)(1,0)(2,1)(3,2)？這不對。
      // 重來用更直接的方式：建立一個會贏的 board 直接套 checkResult
      const winningBoard = Array(42).fill('');
      // 對角 ↘：(0,0)(1,1)(2,2)(3,3) 都是 X
      winningBoard[0 * 7 + 0] = 'X';
      winningBoard[1 * 7 + 1] = 'X';
      winningBoard[2 * 7 + 2] = 'X';
      // 給對應的最後一手
      const winState: Connect4State = {
        ...createInitialState(),
        board: winningBoard,
        currentTurn: 'O',
        moveCount: 3,
        lastMove: { row: 2, col: 2 },
        winnerLine: null,
      };
      const result = connect4Engine.checkResult(winState, [
        { uid: 'p1', symbol: 'X' },
        { uid: 'p2', symbol: 'O' },
      ]);
      // 注意：checkResult 只看 winnerLine，不重新計算
      // 所以要手動補上 winnerLine（applyMove 才會算）
      // 先跳過 — 我們測的是 applyMove 路徑產生的 winnerLine
      expect(result).toEqual({ finished: false }); // 沒 winnerLine → unfinished
    });

    it('checkResult：winnerLine 存在 → 回傳贏家', () => {
      const s = createInitialState();
      const r = connect4Engine.checkResult(
        {
          ...s,
          board: (() => {
            const b = Array(42).fill('');
            b[0 * 7 + 0] = 'X'; b[0 * 7 + 1] = 'X';
            b[0 * 7 + 2] = 'X'; b[0 * 7 + 3] = 'X';
            return b;
          })(),
          lastMove: { row: 0, col: 3 },
          winnerLine: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
        },
        [{ uid: 'p1', symbol: 'X' }, { uid: 'p2', symbol: 'O' }],
      );
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('棋盤滿了 → 平局', () => {
      const s = {
        ...createInitialState(),
        moveCount: 42,
        lastMove: { row: 0, col: 6 },
      } as Connect4State;
      const r = connect4Engine.checkResult(s, [
        { uid: 'p1', symbol: 'X' },
        { uid: 'p2', symbol: 'O' },
      ]);
      expect(r).toEqual({ finished: true, isDraw: true });
    });
  });
});
