import type { GameDefinition } from '../../core/types/game';
import TicTacToeIcon from './Icon';
import { tictactoeEngine } from './engine';
import type { TicTacToeState } from './types';

export const tictactoeDefinition: GameDefinition<TicTacToeState> = {
  id: 'tictactoe',
  name: '井字遊戲',
  description: '兩人輪流在 3×3 棋盤上放置 X 與 O，先連成一線者獲勝。',
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./TicTacToe').then((m) => m.default),
  engine: tictactoeEngine,
  syncStrategy: 'hybrid',
  icon: TicTacToeIcon,
  estimatedDurationMin: 3,
  tutorialSteps: [
    '雙方輪流在 3×3 棋盤上點擊空格放置 X 或 O。',
    '先讓自己的符號（X 或 O）橫、直、或斜連成一線（3 個）者獲勝。',
    '若 9 格都下完仍未分勝負則為平手。',
  ],
};

export { default as TicTacToeIcon } from './Icon';
export { tictactoeEngine } from './engine';
export * from './types';
