import { describe, it, expect } from 'vitest';
import { reversiEngine, hasValidMove } from './engine';
import {
  BOARD_SIZE,
  TOTAL_CELLS,
  type Cell,
  type ReversiState,
} from './types';
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

function getCell(state: ReversiState, row: number, col: number): string {
  return state.board[row * BOARD_SIZE + col];
}

describe('reversiEngine', () => {
  describe('initial state', () => {
    it('8x8 棋盤中間四格標準開局', () => {
      const s = reversiEngine.getInitialState();
      expect(s.board.length).toBe(TOTAL_CELLS);
      // 中央 2x2：O X / X O
      // (3,3)=O, (3,4)=X, (4,3)=X, (4,4)=O  (索引從 0)
      expect(getCell(s, 3, 3)).toBe('O');
      expect(getCell(s, 3, 4)).toBe('X');
      expect(getCell(s, 4, 3)).toBe('X');
      expect(getCell(s, 4, 4)).toBe('O');
      // 其他都是空
      expect(getCell(s, 0, 0)).toBe('');
      expect(getCell(s, 7, 7)).toBe('');
      // X 先手
      expect(s.currentTurn).toBe('X');
      expect(s.moveCount).toBe(0);
      expect(s.passCount).toBe(0);
    });

    it('初始合法步：X 有 4 個合法步', () => {
      const s = reversiEngine.getInitialState();
      // X 的合法步是 4 個：與中央 2x2 相鄰的空位
      // 中央：(3,3)=O, (3,4)=X, (4,3)=X, (4,4)=O
      // (2,3) → 南 (3,3)O 翻到 (4,3)X
      // (3,2) → 東 (3,3)O 翻到 (3,4)X
      // (4,5) → 西 (4,4)O 翻到 (4,3)X
      // (5,4) → 北 (4,4)O 翻到 (3,4)X
      expect(reversiEngine.validateMove(s, move(2, 3))).toBe(true);
      expect(reversiEngine.validateMove(s, move(3, 2))).toBe(true);
      expect(reversiEngine.validateMove(s, move(4, 5))).toBe(true);
      expect(reversiEngine.validateMove(s, move(5, 4))).toBe(true);
    });
  });

  describe('validateMove', () => {
    it('拒絕已佔用的格子', () => {
      const s = reversiEngine.getInitialState();
      expect(reversiEngine.validateMove(s, move(3, 3))).toBe(false); // 已有 O
    });

    it('拒絕無翻子的位置', () => {
      const s = reversiEngine.getInitialState();
      expect(reversiEngine.validateMove(s, move(0, 0))).toBe(false);
    });

    it('拒絕超出範圍的座標', () => {
      const s = reversiEngine.getInitialState();
      expect(reversiEngine.validateMove(s, move(-1, 0))).toBe(false);
      expect(reversiEngine.validateMove(s, move(0, 8))).toBe(false);
      expect(reversiEngine.validateMove(s, move(8, 8))).toBe(false);
    });
  });

  describe('applyMove', () => {
    it('落子並翻開一個方向的對手棋子', () => {
      // X 在 (2,4) 落子，會翻 (3,4) 的 X... 不對
      // 讓我重新算：中央是 O(3,3) X(3,4) X(4,3) O(4,4)
      // X 在 (2,4) 落子，會向下翻 (3,4)X → 錯誤（不能翻自己）
      // 正確：X 在 (5,3) 落子會翻 (4,3) 的 X... 也不對
      // 讓我重新推理：X 在 (2,4) 落子，北方沒有，東是 X(3,4) 直接自己，不用翻
      // 等等，我搞混了，中央是 (3,3)=O, (3,4)=X, (4,3)=X, (4,4)=O
      //  X (2,4) 落子：西邊是 (2,3)=空，東邊是 (2,5)=空
      //              北邊是 (1,4)=空
      //              南邊是 (3,4)=X(自己)，不能翻
      // 等等，那 X 沒合法步在 (2,4)！？讓我重新算中央...
      // 初始：
      //   . . . . . . . .
      //   . . . . . . . .
      //   . . . . . . . .
      //   . . . O X . . .   <- row 3
      //   . . . X O . . .   <- row 4
      //   . . . . . . . .
      //   . . . . . . . .
      //   . . . . . . . .
      // X(3,4) 的合法步：找 X 周圍會被翻的位置
      // - 北方 (2,4) = 空
      //   (1,4) = 空  沒有
      // - 西 (3,3) = O 緊鄰，需找 X 收尾
      //   (3,2) = 空  不行
      //   (3,1) = 空  不行
      //   (3,0) = 空  不行
      //   沒有 X 收尾 → 西不通
      // - 東 (3,5) = 空  沒有對手可翻
      // - 南 (4,4) = O 緊鄰
      //   (5,4) = 空  不行
      // - 西北 (2,3) = 空
      // - 東北 (2,5) = 空
      // - 西南 (4,3) = X 自己，無對手可翻
      // - 東南 (4,5) = 空
      // 等等，X 沒有任何合法步？！這是測試題的 bug。
      // 重新驗算：
      // X 在 (3,4)，周圍 8 格：
      //   (2,3)空 (2,4)空 (2,5)空
      //   (3,3)O  (3,5)空
      //   (4,3)X  (4,4)O  (4,5)空
      // 對每個方向：
      // 1. 西 (3,3)O → 然後要 X。 (3,2)空 → 不行
      // 2. 南 (4,4)O → 然後要 X。 (5,4)空 → 不行
      // 所以 X 在 (3,4) 確實沒合法步？
      // 但 X 在 (2,3) 呢？ (2,3) 周圍：
      //   (1,2)空 (1,3)空 (1,4)空
      //   (2,2)空 (2,4)空
      //   (3,2)空 (3,3)O (3,4)X
      // 對 (3,3)O 來看，要 (3,4)X 在 (3,4)... 等等 (3,4) 就是自己。所以
      // (2,3) 落 X：西 (2,2)空、東 (2,4)空、北 (1,3)空
      //           南 (3,3)O → (4,3)X 自己！翻 (3,3) 成功！
      // 所以 X 的合法步是 (2,3) 而不是 (2,4)
      // 我之前寫的 init 邏輯是 X 在 (3,4) 和 (4,3) 兩個，O 在 (3,3) 和 (4,4)
      // 讓我重新整理
      const initial = reversiEngine.getInitialState();
      const xLegalMoves: Array<[number, number]> = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (reversiEngine.validateMove(initial, move(r, c))) {
            xLegalMoves.push([r, c]);
          }
        }
      }
      expect(xLegalMoves.length).toBe(4);
    });

    it('X 在 (2,3) 落子：翻轉 (3,3) 的 O', () => {
      let s = reversiEngine.getInitialState();
      s = reversiEngine.applyMove(s, move(2, 3));
      // 落子
      expect(getCell(s, 2, 3)).toBe('X');
      // 翻子：(3,3) 從 O 變 X
      expect(getCell(s, 3, 3)).toBe('X');
      // 其他不變
      expect(getCell(s, 3, 4)).toBe('X');
      expect(getCell(s, 4, 3)).toBe('X');
      expect(getCell(s, 4, 4)).toBe('O');
      // 切換到 O
      expect(s.currentTurn).toBe('O');
      expect(s.moveCount).toBe(1);
      expect(s.passCount).toBe(0);
      expect(s.lastMove).toEqual({ row: 2, col: 3 });
      expect(s.lastFlips).toEqual([{ row: 3, col: 3 }]);
    });
  });

  describe('checkResult', () => {
    it('棋盤未滿：未結束', () => {
      const s = reversiEngine.getInitialState();
      const r = reversiEngine.checkResult(s, players);
      expect(r.finished).toBe(false);
    });

    it('棋盤已滿（moveCount=64）：根據棋子數判勝負', () => {
      // 構造一個 X 全贏的局面
      const s: ReversiState = {
        ...reversiEngine.getInitialState(),
        board: Array<Cell>(TOTAL_CELLS).fill('X'),
        moveCount: TOTAL_CELLS,
      };
      const r = reversiEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.isDraw).toBeFalsy();
      expect(r.winnerId).toBe('p1'); // X player
    });

    it('棋盤已滿：平手', () => {
      // 把 board 改成一半 X 一半 O
      const half = Array<Cell>(TOTAL_CELLS).fill('X');
      for (let i = 0; i < TOTAL_CELLS / 2; i++) half[i] = 'O';
      const s: ReversiState = {
        ...reversiEngine.getInitialState(),
        board: half,
        moveCount: TOTAL_CELLS,
      };
      const r = reversiEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
      expect(r.isDraw).toBe(true);
    });

    it('passCount >= 2：遊戲結束（雙方都無法走）', () => {
      const s: ReversiState = {
        ...reversiEngine.getInitialState(),
        passCount: 2,
      };
      const r = reversiEngine.checkResult(s, players);
      expect(r.finished).toBe(true);
    });
  });

  describe('hasValidMove', () => {
    it('初始狀態 X 有合法步', () => {
      const s = reversiEngine.getInitialState();
      expect(hasValidMove(s, 'X')).toBe(true);
    });

    it('初始狀態 O 也有合法步（4 個）', () => {
      const s = reversiEngine.getInitialState();
      expect(hasValidMove(s, 'O')).toBe(true);
    });

    it('只有 2 個棋子的極端局面：當前玩家可能無合法步', () => {
      // 構造一個沒有合法步的狀態
      // X 棋子在一個角，沒有任何對手相鄰
      const board: Cell[] = Array<Cell>(TOTAL_CELLS).fill('');
      board[0] = 'X';
      board[63] = 'O';
      const s: ReversiState = {
        ...reversiEngine.getInitialState(),
        board,
        moveCount: 2,
        passCount: 1,
      };
      // X 沒有任何對手相鄰（只有 (0,0) 旁邊是空或邊界）
      expect(hasValidMove(s, 'X')).toBe(false);
    });
  });
});
