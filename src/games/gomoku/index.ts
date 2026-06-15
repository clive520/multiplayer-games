import type { GameDefinition } from '../../core/types/game';
import GomokuIcon from './Icon';
import { gomokuEngine } from './engine';
import { gomokuAI } from './ai';
import { formatGomokuSymbol } from './symbols';
import type { GomokuState } from './types';

export const gomokuDefinition: GameDefinition<GomokuState> = {
  id: 'gomoku',
  name: '五子棋',
  description: `兩人輪流在 15x15 棋盤上落子，先連成 5 子者獲勝。`,
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./Gomoku').then((m) => m.default),
  engine: gomokuEngine,
  syncStrategy: 'hybrid',
  icon: GomokuIcon,
  formatSymbol: formatGomokuSymbol,
  estimatedDurationMin: 15,
  aiEngine: gomokuAI,
  tutorialSteps: [
    '黑棋先手，雙方輪流在 15×15 棋盤上落子。',
    '自己的棋子橫、直、或斜連成 5 個（或以上）即獲勝。',
    '棋盤上沒有禁手限制，雙方自由落子。',
    '棋盤下滿（225 子）仍無連 5 為平手。',
  ],
};

export { default as GomokuIcon } from './Icon';
export { gomokuEngine } from './engine';
export { gomokuAI } from './ai';
export { formatGomokuSymbol } from './symbols';
export * from './types';
