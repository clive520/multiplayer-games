import { describe, it, expect } from 'vitest';
import { getInitialBoard } from './board';

describe('getInitialBoard', () => {
  it('井字：9 格全空', () => {
    const board = getInitialBoard('tictactoe');
    expect(board.length).toBe(9);
    expect(board.every((c) => c === '')).toBe(true);
  });

  it('五子棋：225 格全空', () => {
    const board = getInitialBoard('gomoku');
    expect(board.length).toBe(225);
    expect(board.every((c) => c === '')).toBe(true);
  });

  it('黑白棋：64 格，中央 4 子交叉擺放', () => {
    const board = getInitialBoard('reversi');
    expect(board.length).toBe(64);
    // BOARD_SIZE = 8, mid = 4
    // 標準開局：4 個中央格子交叉擺放
    //   (3,3)=O, (3,4)=X
    //   (4,3)=X, (4,4)=O
    // 索引：row * 8 + col
    expect(board[3 * 8 + 3]).toBe('O'); // (3,3) = idx 27
    expect(board[3 * 8 + 4]).toBe('X'); // (3,4) = idx 28
    expect(board[4 * 8 + 3]).toBe('X'); // (4,3) = idx 35
    expect(board[4 * 8 + 4]).toBe('O'); // (4,4) = idx 36
    // 其他全空
    let nonEmptyCount = 0;
    for (const c of board) {
      if (c !== '') nonEmptyCount += 1;
    }
    expect(nonEmptyCount).toBe(4);
  });

  it('未知遊戲回傳空陣列', () => {
    const board = getInitialBoard('unknown' as never);
    expect(board).toEqual([]);
  });
});
