import type { GameDefinition } from './core/types/game';
import { tictactoeDefinition } from './games/tictactoe';
import { gomokuDefinition } from './games/gomoku';

export const gameRegistry: GameDefinition[] = [tictactoeDefinition, gomokuDefinition];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
