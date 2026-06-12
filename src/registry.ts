import type { GameDefinition } from './core/types/game';
import { tictactoeDefinition } from './games/tictactoe';

export const gameRegistry: GameDefinition[] = [tictactoeDefinition];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
