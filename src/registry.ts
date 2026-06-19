import type { GameDefinition } from './core/types/game';
import { tictactoeDefinition } from './games/tictactoe';
import { gomokuDefinition } from './games/gomoku';
import { reversiDefinition } from './games/reversi';
import { connect4Definition } from './games/connect4';
import { dotsAndBoxesDefinition } from './games/dotsandboxes';
import { mancalaDefinition } from './games/mancala';

export const gameRegistry: GameDefinition[] = [
  tictactoeDefinition,
  gomokuDefinition,
  reversiDefinition,
  connect4Definition,
  dotsAndBoxesDefinition,
  mancalaDefinition,
];

export function getGameDefinition(id: string): GameDefinition | undefined {
  return gameRegistry.find((g) => g.id === id);
}
