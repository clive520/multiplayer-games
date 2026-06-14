import type { GameDefinition } from './core/types/game';
import { tictactoeDefinition } from './games/tictactoe';
import { gomokuDefinition } from './games/gomoku';
import { reversiDefinition } from './games/reversi';

export const gameRegistry: GameDefinition[] = [
  tictactoeDefinition,
  gomokuDefinition,
  reversiDefinition,
];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
