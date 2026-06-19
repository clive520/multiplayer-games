import type { GameType } from '../types/room';
import { createInitialState as createTictactoeState } from '../../games/tictactoe/types';
import { createInitialState as createGomokuState } from '../../games/gomoku/types';
import { createInitialState as createReversiState } from '../../games/reversi/types';
import { createInitialState as createConnect4State } from '../../games/connect4/types';
import { createInitialState as createDotsAndBoxesState } from '../../games/dotsandboxes/types';
import { createInitialState as createMancalaState } from '../../games/mancala/types';
import { PITS_PER_SIDE, INITIAL_STONES } from '../../games/mancala/types';

/**
 * 取得遊戲的初始棋盤（IMPROVEMENTS #12 Phase B 復盤用）
 * ReplayBoard 用這個當「slider 在 0」的初始狀態
 *
 * 為什麼需要這個：
 * - 復盤時 index 0 = 還沒下任何棋的棋盤
 * - 不同遊戲的初始棋盤不同（井字=9 空、五子棋=225 空、黑白棋=中央 4 子）
 *
 * 回傳 cell 陣列（與 game state 的 board 結構一致）
 * 點點連連是特殊情況：3 個 grid（hEdges/vEdges/boxOwners）扁平化為單一陣列
 */
export function getInitialBoard(gameType: GameType): ReadonlyArray<string> {
  switch (gameType) {
    case 'tictactoe':
      return createTictactoeState().board as ReadonlyArray<string>;
    case 'gomoku':
      return createGomokuState().board as ReadonlyArray<string>;
    case 'reversi':
      return createReversiState().board as ReadonlyArray<string>;
    case 'connect4':
      return createConnect4State().board as ReadonlyArray<string>;
    case 'dotsandboxes': {
      const s = createDotsAndBoxesState();
      return [
        ...s.hEdges.flat(),
        ...s.vEdges.flat(),
        ...s.boxOwners.flat(),
      ];
    }
    case 'mancala': {
      // 14 元素：[X pits 0..5, O pits 0..5, X store, O store]
      const flat: string[] = [];
      for (let i = 0; i < PITS_PER_SIDE; i++) flat.push(String(INITIAL_STONES));
      for (let i = 0; i < PITS_PER_SIDE; i++) flat.push(String(INITIAL_STONES));
      flat.push('0', '0');
      return flat;
    }
    default:
      return [];
  }
}

// 保留 createMancalaState 給未來使用
void createMancalaState;
