import type { GameDefinition } from '../../core/types/game';
import Connect4Icon from './Icon';
import { connect4Engine } from './engine';
import { connect4AI } from './ai';
import { formatConnect4Symbol } from './symbols';
import { acceptUndo } from './sync';
import type { Connect4State } from './types';

export const connect4Definition: GameDefinition<Connect4State> = {
  id: 'connect4',
  name: 'games.connect4.name',
  description: `兩人在 7×6 棋盤上輪流下子（從頂部落入），4 個連成一線（橫/直/斜）者獲勝。`,
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./Connect4').then((m) => m.default),
  engine: connect4Engine,
  syncStrategy: 'hybrid',
  icon: Connect4Icon,
  formatSymbol: formatConnect4Symbol,
  estimatedDurationMin: 8,
  aiEngine: connect4AI,
  acceptUndo,
  tutorialSteps: [
    '棋盤是 7 欄 × 6 列的格子。',
    '輪到你時點任一欄「頂部」，棋子會自動落到該欄最下面的空格。',
    '先讓自己的棋子（X 或 O）連成 4 個一線（橫、直、斜）就獲勝。',
    '棋盤填滿（42 格）都沒有 4 連線 → 平局。',
  ],
};

export { default as Connect4Icon } from './Icon';
export { connect4Engine } from './engine';
export { connect4AI } from './ai';
export { formatConnect4Symbol } from './symbols';
export * from './types';
