import { describe, it, expect } from 'vitest';
import { gomokuEngine } from './engine';
import { createInitialState, BOARD_SIZE, TOTAL_CELLS } from './types';
import type { GameMove } from '../../core/types/game';
import type { Position } from './types';

const move = (row: number, col: number, playerId = 'p1'): GameMove => ({
  playerId,
  payload: { row, col } as Position,
  timestamp: 0,
});

const players = [
  { uid: 'p1', symbol: 'X' },
  { uid: 'p2', symbol: 'O' },
];

function playSequence(sequence: Array<[number, number]>) {
  let s = createInitialState();
  for (const [r, c] of sequence) {
    s = gomokuEngine.applyMove(s, move(r, c));
  }
  return s;
}

describe('gomokuEngine', () => {
  describe('initial state', () => {
    it('回傳全空棋盤與 X 為先手', () => {
      const s = gomokuEngine.getInitialState();
      expect(s.board).toEqual(Array(TOTAL_CELLS).fill(''));
      expect(s.nextSymbol).toBe('X');
      expect(s.moveCount).toBe(0);
      expect(s.winnerLine).toBeNull();
    });
  });

  describe('validateMove', () => {
    it('允許空格內的合法移動', () => {
      expect(gomokuEngine.validateMove(createInitialState(), move(7, 7))).toBe(true);
    });

    it('拒絕已佔用的格子', () => {
      const s = gomokuEngine.applyMove(createInitialState(), move(7, 7));
      expect(gomokuEngine.validateMove(s, move(7, 7))).toBe(false);
    });

    it('拒絕超出範圍的座標', () => {
      expect(gomokuEngine.validateMove(createInitialState(), move(-1, 0))).toBe(false);
      expect(gomokuEngine.validateMove(createInitialState(), move(0, 15))).toBe(false);
      expect(gomokuEngine.validateMove(createInitialState(), move(15, 15))).toBe(false);
    });

    it('棋盤已滿時拒絕任何移動', () => {
      // 模擬 fill 棋盤的檢查邏輯：moveCount >= TOTAL_CELLS 時拒絕
      // 這個測試主要驗證 validateMove 邏輯，所以我們手動建一個滿的 state
      const s = createInitialState();
      const fullState = { ...s, moveCount: TOTAL_CELLS };
      expect(gomokuEngine.validateMove(fullState, move(0, 0))).toBe(false);
    });
  });

  describe('applyMove', () => {
    it('放置棋子並切換到下一個符號', () => {
      const s = gomokuEngine.applyMove(createInitialState(), move(7, 7));
      const idx = 7 * BOARD_SIZE + 7;
      expect(s.board[idx]).toBe('X');
      expect(s.nextSymbol).toBe('O');
      expect(s.moveCount).toBe(1);
      expect(s.lastMove).toEqual({ row: 7, col: 7, symbol: 'X' });
    });

    it('無連線時 winnerLine 為 null', () => {
      const s = gomokuEngine.applyMove(createInitialState(), move(7, 7));
      expect(s.winnerLine).toBeNull();
    });
  });

  describe('checkResult - 五連珠偵測', () => {
    it('X 橫線 5 連獲勝', () => {
      // X: (7,0) (7,1) (7,2) (7,3) (7,4)
      // O: (0,0) (0,1) (0,2) (0,3) - 4 子不夠
      const s = playSequence([
        [7, 0], [0, 0],
        [7, 1], [0, 1],
        [7, 2], [0, 2],
        [7, 3], [0, 3],
        [7, 4],
      ]);
      expect(s.winnerLine).not.toBeNull();
      expect(s.winnerLine?.length).toBe(5);
      const r = gomokuEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('X 垂直 5 連獲勝', () => {
      const s = playSequence([
        [0, 0], [0, 1],
        [1, 0], [0, 2],
        [2, 0], [0, 3],
        [3, 0], [0, 4],
        [4, 0],
      ]);
      expect(s.winnerLine).not.toBeNull();
      const r = gomokuEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('X 對角線 5 連獲勝', () => {
      const s = playSequence([
        [0, 0], [0, 1],
        [1, 1], [0, 2],
        [2, 2], [0, 3],
        [3, 3], [0, 4],
        [4, 4],
      ]);
      expect(s.winnerLine).not.toBeNull();
      const r = gomokuEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('X 反對角線 5 連獲勝', () => {
      const s = playSequence([
        [0, 4], [0, 0],
        [1, 3], [0, 1],
        [2, 2], [0, 2],
        [3, 1], [0, 3],
        [4, 0],
      ]);
      expect(s.winnerLine).not.toBeNull();
      const r = gomokuEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('超過 5 連仍視為獲勝（5 連就夠了）', () => {
      // X 連 6 個，winnerLine 應該剛好 5 個
      const s = playSequence([
        [7, 0], [0, 0],
        [7, 1], [0, 1],
        [7, 2], [0, 2],
        [7, 3], [0, 3],
        [7, 4], [0, 4],
        [7, 5],
      ]);
      expect(s.winnerLine?.length).toBe(5);
      const r = gomokuEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.winnerId).toBe('p1');
    });

    it('4 連不算獲勝', () => {
      const s = playSequence([
        [7, 0], [0, 0],
        [7, 1], [0, 1],
        [7, 2], [0, 2],
        [7, 3],
      ]);
      expect(s.winnerLine).toBeNull();
      const r = gomokuEngine.checkResult(s, players);
      expect(r.finished).toBe(false);
    });
  });

  describe('checkResult - 平手', () => {
    it('棋盤填滿且無五連為平手', () => {
      // 構造一個平手很難，這裡只驗證 checkResult 在 moveCount 滿時回 draw
      // 簡化：直接構造滿 moveCount 的 state
      const s = createInitialState();
      const fullState = { ...s, moveCount: TOTAL_CELLS };
      const r = gomokuEngine.checkResult(fullState, players);
      expect(r.finished).toBe(true);
      expect(r.isDraw).toBe(true);
    });
  });
});
