import type { GameDefinition } from '../../core/types/game';
import TicTacToe from './TicTacToe';
import { tictactoeEngine } from './engine';
import type { TicTacToeState } from './types';

export const tictactoeDefinition: GameDefinition<TicTacToeState> = {
  id: 'tictactoe',
  name: '井字遊戲',
  description: '兩人輪流在 3×3 棋盤上放置 X 與 O，先連成一線者獲勝。',
  minPlayers: 2,
  maxPlayers: 2,
  component: TicTacToe,
  engine: tictactoeEngine,
  syncStrategy: 'hybrid',
};

export { default as TicTacToe } from './TicTacToe';
export { ResultScreen } from './ResultScreen';
export { tictactoeEngine } from './engine';
export * from './types';
