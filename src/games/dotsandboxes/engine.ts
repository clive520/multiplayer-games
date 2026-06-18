import type { GameEngine, GameResult } from '../../core/types/game';
import {
  BOX_ROWS,
  BOX_COLS,
  cloneGrid,
  createInitialState,
  isValidState,
  type DotsAndBoxesState,
  type EdgeDirection,
} from './types';

function inBoundsH(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row <= BOX_ROWS && col >= 0 && col < BOX_COLS;
}
function inBoundsV(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < BOX_ROWS && col >= 0 && col <= BOX_COLS;
}

/** 判斷方格 (bRow, bCol) 是否 4 邊都畫了 */
function isBoxComplete(
  hEdges: ReadonlyArray<ReadonlyArray<'X' | 'O' | null>>,
  vEdges: ReadonlyArray<ReadonlyArray<'X' | 'O' | null>>,
  bRow: number,
  bCol: number,
): boolean {
  return (
    hEdges[bRow][bCol] !== null &&         // 上邊
    hEdges[bRow + 1][bCol] !== null &&     // 下邊
    vEdges[bRow][bCol] !== null &&         // 左邊
    vEdges[bRow][bCol + 1] !== null        // 右邊
  );
}

export const dotsAndBoxesEngine: GameEngine<DotsAndBoxesState> = {
  id: 'dotsandboxes',
  name: '點點連連',
  minPlayers: 2,
  maxPlayers: 2,
  description: `兩人在 ${BOX_ROWS}×${BOX_COLS} 方格上輪流畫邊，封住方格者佔領並獲額外回合，佔領較多方格者獲勝。`,
  initialSymbolPool: ['X', 'O'],

  getInitialState: () => createInitialState(),

  validateMove(state, move) {
    const p = move.payload as { type?: EdgeDirection; row?: number; col?: number };
    if (!p || (p.type !== 'h' && p.type !== 'v')) return false;
    if (typeof p.row !== 'number' || typeof p.col !== 'number') return false;
    if (p.type === 'h') {
      if (!inBoundsH(p.row, p.col)) return false;
      return state.hEdges[p.row][p.col] === null;
    }
    if (!inBoundsV(p.row, p.col)) return false;
    return state.vEdges[p.row][p.col] === null;
  },

  applyMove(state, move) {
    const p = move.payload as { type: EdgeDirection; row: number; col: number };
    const player = state.currentTurn;
    const hEdges = cloneGrid(state.hEdges);
    const vEdges = cloneGrid(state.vEdges);
    const boxOwners = cloneGrid(state.boxOwners);

    // 1. 畫邊
    if (p.type === 'h') {
      hEdges[p.row][p.col] = player;
    } else {
      vEdges[p.row][p.col] = player;
    }

    // 2. 檢查是否完成方格
    //    h 邊影響 (row-1, col) 上方方格和 (row, col) 下方方格
    //    v 邊影響 (row, col-1) 左方方格和 (row, col) 右方方格
    const completedBoxes: Array<{ row: number; col: number }> = [];
    const checkBox = (bRow: number, bCol: number): void => {
      if (bRow < 0 || bRow >= BOX_ROWS || bCol < 0 || bCol >= BOX_COLS) return;
      if (boxOwners[bRow][bCol] !== null) return; // 已佔領
      if (isBoxComplete(hEdges, vEdges, bRow, bCol)) {
        boxOwners[bRow][bCol] = player;
        completedBoxes.push({ row: bRow, col: bCol });
      }
    };

    if (p.type === 'h') {
      checkBox(p.row - 1, p.col); // 上方
      checkBox(p.row, p.col);     // 下方
    } else {
      checkBox(p.row, p.col - 1); // 左方
      checkBox(p.row, p.col);     // 右方
    }

    // 3. 計算得分
    const scores = { ...state.scores };
    if (player === 'X') scores.X += completedBoxes.length;
    else scores.O += completedBoxes.length;

    // 4. 額外回合（如有得分）/ 切換玩家
    const nextTurn = completedBoxes.length > 0
      ? player
      : (player === 'X' ? 'O' : 'X');

    return {
      hEdges,
      vEdges,
      boxOwners,
      currentTurn: nextTurn,
      moveCount: state.moveCount + 1,
      lastMove: { type: p.type, row: p.row, col: p.col },
      scores,
    };
  },

  checkResult(state, players): GameResult {
    // 還有方格沒被佔 → 遊戲未結束
    if (state.moveCount < 0) return { finished: false }; // 防止誤判
    if (state.scores.X + state.scores.O < BOX_ROWS * BOX_COLS) {
      return { finished: false };
    }
    // 全部佔領 → 比較分數
    if (state.scores.X > state.scores.O) {
      const winner = players.find((p) => p.symbol === 'X');
      return { finished: true, winnerId: winner?.uid };
    }
    if (state.scores.O > state.scores.X) {
      const winner = players.find((p) => p.symbol === 'O');
      return { finished: true, winnerId: winner?.uid };
    }
    return { finished: true, isDraw: true };
  },
};

// 補充 re-export
export { isValidState };
