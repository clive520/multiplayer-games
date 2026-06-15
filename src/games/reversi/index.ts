import type { GameDefinition } from '../../core/types/game';
import ReversiIcon from './Icon';
import { reversiEngine } from './engine';
import { reversiAI } from './ai';
import { formatReversiSymbol } from './symbols';
import type { ReversiState } from './types';

export const reversiDefinition: GameDefinition<ReversiState> = {
  id: 'reversi',
  name: 'games.reversi.name',
  description: '兩人在 8x8 棋盤上輪流落子，翻轉對手被夾住的棋子，棋子多者勝。',
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./Reversi').then((m) => m.default),
  engine: reversiEngine,
  syncStrategy: 'hybrid',
  icon: ReversiIcon,
  formatSymbol: formatReversiSymbol,
  estimatedDurationMin: 10,
  aiEngine: reversiAI,
  tutorialSteps: [
    '黑棋先手，雙方輪流在 8×8 棋盤上落子。',
    '落子時必須能夾住（你的新子與既有子中間有連續對手子）至少一條線的對手棋子。',
    '被夾住的對手棋子會翻面變成你的顏色。',
    '若輪到你時沒有任何合法落子位置，必須按「Pass」讓對手下。',
    '雙方都無法落子或棋盤下滿時，棋子多者獲勝。',
  ],
};

export { default as ReversiIcon } from './Icon';
export { reversiEngine } from './engine';
export { reversiAI } from './ai';
export { formatReversiSymbol } from './symbols';
export * from './types';
