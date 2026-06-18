import type { GameDefinition } from './core/types/game';
import { tictactoeDefinition } from './games/tictactoe';
import { gomokuDefinition } from './games/gomoku';
import { reversiDefinition } from './games/reversi';
import { connect4Definition } from './games/connect4';

export const gameRegistry: GameDefinition[] = [
  tictactoeDefinition,
  gomokuDefinition,
  reversiDefinition,
  connect4Definition,
];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
