import type { ReactNode } from 'react';
import type { GameType } from '../types/room';
import { BOARD_SIZE as TICTACTOE_SIZE } from '../../games/tictactoe/types';
import { BOARD_SIZE as GOMOKU_SIZE } from '../../games/gomoku/types';
import { BOARD_SIZE as REVERSI_SIZE } from '../../games/reversi/types';

export interface ReplayRenderers {
  /** 棋盤邊長（3 = 井字、8 = 黑白棋、15 = 五子棋） */
  boardSize: number;
  /** 棋盤外框 + 底色 className */
  boardClassName: string;
  /** 渲染單一格子的 React node（cell 是 'X' / 'O' / ''） */
  renderCell: (cell: string, isLastMoveHere: boolean, isFlipped: boolean) => ReactNode;
  /** 每格最大 px（預設依 boardSize 自動） */
  maxCellPx?: number;
}

/**
 * 依遊戲類型取得對應的復盤渲染器（IMPROVEMENTS #12 Phase B）
 *
 * 設計：每個遊戲的視覺風格不同（井字用純文字、五子棋/黑白棋用圓形棋子），
 * 但 ReplayBoard 元件本身不關心 — 透過 renderer 注入。
 *
 * 為什麼放在 core/ 而非 games/：
 * - 避免循環依賴（games → core → games）
 * - 復盤是 UI 概念，跨遊戲共用元件
 */
export function getReplayRenderers(gameType: GameType): ReplayRenderers {
  switch (gameType) {
    case 'tictactoe':
      return {
        boardSize: TICTACTOE_SIZE,
        boardClassName: 'dark:bg-slate-800 bg-app-card border dark:border-slate-700 border-app-border',
        renderCell: (cell, isLastMoveHere) => {
          if (!cell) return null;
          const isX = cell === 'X';
          return (
            <span
              className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${
                isX ? 'text-blue-400' : 'text-red-400'
              }`}
            >
              {cell}
              {isLastMoveHere && (
                <span
                  aria-hidden
                  className="absolute inset-1 rounded border-2 border-yellow-400"
                />
              )}
            </span>
          );
        },
      };
    case 'gomoku':
      return {
        boardSize: GOMOKU_SIZE,
        boardClassName: 'bg-amber-50 border border-amber-900/30',
        renderCell: (cell, isLastMoveHere, isFlipped) => {
          if (!cell) return null;
          const isX = cell === 'X';
          return (
            <>
              <span
                className={`absolute inset-1 rounded-full shadow-md ${
                  isX ? 'bg-black' : 'bg-white ring-2 ring-black'
                }`}
              />
              {isLastMoveHere && (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-pulse-ring rounded"
                />
              )}
              {isFlipped && (
                <span
                  aria-hidden
                  className="absolute inset-1 rounded-full ring-2 ring-yellow-400"
                />
              )}
            </>
          );
        },
      };
    case 'reversi':
      return {
        boardSize: REVERSI_SIZE,
        boardClassName: 'dark:bg-emerald-900/30 bg-emerald-900/10 border border-emerald-900/40',
        renderCell: (cell, isLastMoveHere, isFlipped) => {
          if (!cell) return null;
          const isX = cell === 'X';
          return (
            <>
              <span
                className={`absolute inset-2 rounded-full shadow-md ${
                  isX ? 'bg-black' : 'bg-white ring-1 ring-slate-500'
                }`}
              />
              {isLastMoveHere && (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-pulse-ring rounded"
                />
              )}
              {isFlipped && (
                <span
                  aria-hidden
                  className="absolute inset-2 rounded-full ring-2 ring-yellow-400"
                />
              )}
            </>
          );
        },
        maxCellPx: 36,
      };
    default:
      return {
        boardSize: 3,
        boardClassName: 'dark:bg-slate-800 bg-app-card border dark:border-slate-700 border-app-border',
        renderCell: (cell) => cell,
      };
  }
}
