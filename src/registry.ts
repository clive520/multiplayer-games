import type { GameDefinition } from './core/types/game';

export const gameRegistry: GameDefinition[] = [];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
