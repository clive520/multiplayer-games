import type { GameDefinition } from '../../core/types/game';
import MancalaIcon from './Icon';
import { mancalaEngine } from './engine';
import { mancalaAI } from './ai';
import { formatMancalaSymbol } from './symbols';
import { acceptUndo } from './sync';
import type { MancalaState } from './types';
import { PITS_PER_SIDE } from './types';

export const mancalaDefinition: GameDefinition<MancalaState> = {
  id: 'mancala',
  name: 'games.mancala.name',
  description: `兩人在 6+6 個 pit + 2 個 store 上輪流播種，store 內石頭多者獲勝。`,
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./Mancala').then((m) => m.default),
  engine: mancalaEngine,
  syncStrategy: 'hybrid',
  icon: MancalaIcon,
  formatSymbol: formatMancalaSymbol,
  estimatedDurationMin: 8,
  aiEngine: mancalaAI,
  acceptUndo,
  tutorialSteps: [
    `棋盤有 6+6 個 pit（每側 ${PITS_PER_SIDE} 個）+ 2 個 store。`,
    '輪到你時點自己一側任一有石頭的 pit，拿起所有石頭沿播種順序撒。',
    '跳過對手的 store；最後一顆落點在自己 store 可額外一回合，落自己空格可捕子。',
    '一側完全清空時遊戲結束，store 內石頭多者獲勝。',
  ],
};

export { default as MancalaIcon } from './Icon';
export { mancalaEngine } from './engine';
export { mancalaAI } from './ai';
export { formatMancalaSymbol } from './symbols';
export * from './types';
