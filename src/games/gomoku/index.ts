import type { GameDefinition } from '../../core/types/game';
import Gomoku from './Gomoku';
import GomokuIcon from './Icon';
import { gomokuEngine } from './engine';
import { formatGomokuSymbol } from './symbols';
import type { GomokuState } from './types';

export const gomokuDefinition: GameDefinition<GomokuState> = {
  id: 'gomoku',
  name: '五子棋',
  description: `兩人輪流在 15x15 棋盤上落子，先連成 5 子者獲勝。`,
  minPlayers: 2,
  maxPlayers: 2,
  component: Gomoku,
  engine: gomokuEngine,
  syncStrategy: 'hybrid',
  icon: GomokuIcon,
  formatSymbol: formatGomokuSymbol,
};

export { default as Gomoku } from './Gomoku';
export { default as GomokuIcon } from './Icon';
export { gomokuEngine } from './engine';
export { formatGomokuSymbol } from './symbols';
export * from './types';
