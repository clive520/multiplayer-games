import { describe, it, expect } from 'vitest';
import { tictactoeEngine } from './engine';
import { createInitialState } from './types';
import type { GameMove } from '../../core/types/game';

const move = (row: number, col: number, playerId = 'p1'): GameMove => ({
  playerId,
  payload: { row, col },
  timestamp: 0,
});

const players = [
  { uid: 'p1', symbol: 'X' },
  { uid: 'p2', symbol: 'O' },
];

describe('tictactoeEngine', () => {
  describe('initial state', () => {
    it('回傳全空棋盤與 X 為先手', () => {
      const s = tictactoeEngine.getInitialState();
      expect(s.board).toEqual(Array(9).fill(null));
      expect(s.nextSymbol).toBe('X');
      expect(s.moveCount).toBe(0);
    });
  });

  describe('validateMove', () => {
    it('允許空格內的合法移動', () => {
      expect(tictactoeEngine.validateMove(createInitialState(), move(0, 0))).toBe(true);
    });

    it('拒絕已佔用的格子', () => {
      const s = tictactoeEngine.applyMove(createInitialState(), move(0, 0));
      expect(tictactoeEngine.validateMove(s, move(0, 0))).toBe(false);
    });

    it('拒絕超出範圍的座標', () => {
      expect(tictactoeEngine.validateMove(createInitialState(), move(-1, 0))).toBe(false);
      expect(tictactoeEngine.validateMove(createInitialState(), move(0, 3))).toBe(false);
      expect(tictactoeEngine.validateMove(createInitialState(), move(1.5, 1))).toBe(false);
    });

    it('棋盤已滿時拒絕任何移動', () => {
      let s = createInitialState();
      const sequence: Array<[number, number]> = [
        [0, 0], [0, 1], [0, 2],
        [1, 1], [1, 0], [1, 2],
        [2, 0], [2, 2], [2, 1],
      ];
      for (const [r, c] of sequence) {
        s = tictactoeEngine.applyMove(s, move(r, c));
      }
      expect(s.moveCount).toBe(9);
      expect(tictactoeEngine.validateMove(s, move(0, 0))).toBe(false);
    });
  });

  describe('applyMove', () => {
    it('放置棋子並切換到下一個符號', () => {
      const s0 = createInitialState();
      const s1 = tictactoeEngine.applyMove(s0, move(1, 1));
      expect(s1.board[4]).toBe('X');
      expect(s1.nextSymbol).toBe('O');
      expect(s1.moveCount).toBe(1);
      expect(s1.lastMove).toEqual({ row: 1, col: 1, symbol: 'X' });
    });

    it('產生新 board 物件（不可變）', () => {
      const s0 = createInitialState();
      const s1 = tictactoeEngine.applyMove(s0, move(0, 0));
      expect(s0.board).not.toBe(s1.board);
      expect(s0.board[0]).toBeNull();
    });
  });

  describe('checkResult', () => {
    it('無勝者且未填滿時未結束', () => {
      const s = tictactoeEngine.applyMove(createInitialState(), move(0, 0));
      const r = tictactoeEngine.checkResult(s, players);
      expect(r.finished).toBe(false);
    });

    it('X 橫線連線獲勝', () => {
      let s = createInitialState();
      s = tictactoeEngine.applyMove(s, move(0, 0));
      s = tictactoeEngine.applyMove(s, move(1, 0));
      s = tictactoeEngine.applyMove(s, move(0, 1));
      s = tictactoeEngine.applyMove(s, move(1, 1));
      s = tictactoeEngine.applyMove(s, move(0, 2));
      const r = tictactoeEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('O 反對角線 [2,4,6] 連線獲勝', () => {
      let s = createInitialState();
      s = tictactoeEngine.applyMove(s, move(0, 0));
      s = tictactoeEngine.applyMove(s, move(0, 2));
      s = tictactoeEngine.applyMove(s, move(0, 1));
      s = tictactoeEngine.applyMove(s, move(1, 1));
      s = tictactoeEngine.applyMove(s, move(2, 2));
      s = tictactoeEngine.applyMove(s, move(2, 0));
      const r = tictactoeEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p2');
    });

    it('填滿且無連線為平手', () => {
      let s = createInitialState();
      const sequence: Array<[number, number]> = [
        [0, 0], [0, 1], [0, 2],
        [1, 2], [1, 0], [2, 0],
        [1, 1], [2, 2], [2, 1],
      ];
      for (const [r, c] of sequence) {
        s = tictactoeEngine.applyMove(s, move(r, c));
      }
      expect(s.board).toEqual([
        'X', 'O', 'X',
        'X', 'X', 'O',
        'O', 'X', 'O',
      ]);
      const r = tictactoeEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.isDraw).toBe(true);
    });
  });
});
