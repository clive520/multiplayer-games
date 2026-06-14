import type { GameDefinition } from '../../core/types/game';
import Reversi from './Reversi';
import { reversiEngine } from './engine';
import type { ReversiState } from './types';

export const reversiDefinition: GameDefinition<ReversiState> = {
  id: 'reversi',
  name: '黑白棋',
  description: '兩人在 8x8 棋盤上輪流落子，翻轉對手被夾住的棋子，棋子多者勝。',
  minPlayers: 2,
  maxPlayers: 2,
  component: Reversi,
  engine: reversiEngine,
  syncStrategy: 'hybrid',
};

export { default as Reversi } from './Reversi';
export { reversiEngine } from './engine';
export * from './types';
