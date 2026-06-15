import { describe, it, expect } from 'vitest';
import { MOVES_CAP, SAVED_HISTORY_PER_USER_CAP } from './history';

describe('history 常數', () => {
  it('井字 moves 上限 = 9（棋盤只有 9 格）', () => {
    expect(MOVES_CAP.tictactoe).toBe(9);
  });

  it('五子棋 moves 上限 = 100（再長就太佔空間）', () => {
    expect(MOVES_CAP.gomoku).toBe(100);
  });

  it('黑白棋 moves 上限 = 80（棋盤填滿也只 60 步）', () => {
    expect(MOVES_CAP.reversi).toBe(80);
  });

  it('每人 saved 上限 = 200', () => {
    expect(SAVED_HISTORY_PER_USER_CAP).toBe(200);
  });
});
