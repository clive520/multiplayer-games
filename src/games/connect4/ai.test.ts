import { describe, it, expect } from 'vitest';
import { connect4AI } from './ai';
import { createInitialState, type Connect4State } from './types';
import { COLS, ROWS } from './types';

function applyCol(state: Connect4State, col: number, symbol: 'X' | 'O'): Connect4State {
  const b = [...state.board];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r * COLS + col] === '') {
      b[r * COLS + col] = symbol;
      return {
        ...state,
        board: b,
        currentTurn: symbol === 'X' ? 'O' : 'X',
        moveCount: state.moveCount + 1,
      };
    }
  }
  return state;
}

describe('connect4AI', () => {
  it('空盤：easy 回傳有效 col（0-6）', () => {
    for (let i = 0; i < 20; i++) {
      const move = connect4AI.selectMove(createInitialState(), 'X', 'easy');
      expect(move).not.toBe(null);
      expect(move!.col).toBeGreaterThanOrEqual(0);
      expect(move!.col).toBeLessThan(COLS);
    }
  });

  it('空盤：normal 偏好中央 col=3', () => {
    const move = connect4AI.selectMove(createInitialState(), 'X', 'normal');
    expect(move!.col).toBe(3);
  });

  it('空盤：hard 也偏好中央', () => {
    const move = connect4AI.selectMove(createInitialState(), 'X', 'hard');
    expect(move!.col).toBe(3);
  });

  it('必贏（normal）：X 在 row 5 col 1,2,3 三連 → 必選 col 0 或 col 4 延伸', () => {
    // 構造：X 在 row 5 col 1,2,3（3 連）
    // X 落 col 0 → 4 連 win
    // X 落 col 4 → 4 連 win
    let s = createInitialState();
    s = applyCol(s, 1, 'X');  // X row 5 col 1
    s = applyCol(s, 0, 'O');  // O row 5 col 0
    s = applyCol(s, 2, 'X');  // X row 5 col 2
    s = applyCol(s, 6, 'O');  // O row 5 col 6
    s = applyCol(s, 3, 'X');  // X row 5 col 3
    // X 3 連在 row 5 col 1,2,3，X 回合
    const move = connect4AI.selectMove(s, 'X', 'normal');
    expect([0, 4]).toContain(move!.col);
  });

  it('必擋（normal）：O 在 row 5 col 0,1,2 三連 → 必選 col 3 阻擋', () => {
    // 構造：O 在 row 5 col 0,1,2（3 連，X 必須擋 col 3）
    // 順序：X 0, O 1, X 6, O 2, X 4, O 3 → 但 O 3 會贏。所以要 X 4 之後 O 不下 3
    // 改成：O 0, X 4, O 1, X 5, O 2 → X 必擋 col 3
    let s = createInitialState();
    s = applyCol(s, 0, 'O');
    s = applyCol(s, 4, 'X');
    s = applyCol(s, 1, 'O');
    s = applyCol(s, 5, 'X');
    s = applyCol(s, 2, 'O');
    // O 3 連 row 5 col 0,1,2。X 回合
    const move = connect4AI.selectMove(s, 'X', 'normal');
    expect(move!.col).toBe(3);
  });

  it('hard 也會贏棋', () => {
    // X row 5 col 1,2,3 三連
    let s = createInitialState();
    s = applyCol(s, 1, 'X');
    s = applyCol(s, 0, 'O');
    s = applyCol(s, 2, 'X');
    s = applyCol(s, 6, 'O');
    s = applyCol(s, 3, 'X');
    const move = connect4AI.selectMove(s, 'X', 'hard');
    expect([0, 4]).toContain(move!.col);
  });

  it('easy 隨機選：回傳合法 col（不擋輸）', () => {
    // easy 完全隨機，不保證擋
    // O 3 連威脅
    let s = createInitialState();
    s = applyCol(s, 0, 'O');
    s = applyCol(s, 4, 'X');
    s = applyCol(s, 1, 'O');
    s = applyCol(s, 5, 'X');
    s = applyCol(s, 2, 'O');
    // 跑 30 次，每次都回傳合法 col 即可（不檢查是否擋，因為 easy 不擋）
    for (let i = 0; i < 30; i++) {
      const move = connect4AI.selectMove(s, 'X', 'easy');
      expect(move).not.toBe(null);
      expect(move!.col).toBeGreaterThanOrEqual(0);
      expect(move!.col).toBeLessThan(COLS);
    }
  });
});
