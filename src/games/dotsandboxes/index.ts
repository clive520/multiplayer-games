import type { GameDefinition } from '../../core/types/game';
import DotsAndBoxesIcon from './Icon';
import { dotsAndBoxesEngine } from './engine';
import { dotsAndBoxesAI } from './ai';
import { formatDotsAndBoxesSymbol } from './symbols';
import { acceptUndo } from './sync';
import type { DotsAndBoxesState } from './types';

export const dotsAndBoxesDefinition: GameDefinition<DotsAndBoxesState> = {
  id: 'dotsandboxes',
  name: 'games.dotsandboxes.name',
  description: `兩人在 4×4 方格矩陣上輪流畫邊，每畫完一條邊若完成方格可額外獲得一回合。方格全滿後佔領較多方格者獲勝。`,
  minPlayers: 2,
  maxPlayers: 2,
  loadComponent: () => import('./DotsAndBoxes').then((m) => m.default),
  engine: dotsAndBoxesEngine,
  syncStrategy: 'hybrid',
  icon: DotsAndBoxesIcon,
  formatSymbol: formatDotsAndBoxesSymbol,
  estimatedDurationMin: 10,
  aiEngine: dotsAndBoxesAI,
  acceptUndo,
  tutorialSteps: [
    '棋盤是 4×4 的方格陣列，由 5×5 的點連成。',
    '輪到你時點任兩點之間的「邊」位置畫一條水平或垂直線。',
    '畫完一條邊，若剛好完成一個方格，該方格會變成你的顏色（藍/紅），並獲得額外一回合。',
    '所有方格都填滿後，佔領較多方格者獲勝。',
  ],
};

export { default as DotsAndBoxesIcon } from './Icon';
export { dotsAndBoxesEngine } from './engine';
export { dotsAndBoxesAI } from './ai';
export { formatDotsAndBoxesSymbol } from './symbols';
export * from './types';
