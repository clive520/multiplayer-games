import type { ComponentType } from 'react';

export interface GameMove {
  playerId: string;
  payload: unknown;
  timestamp: number;
}

export interface GameResult {
  finished: boolean;
  winnerId?: string;
  isDraw?: boolean;
}

export interface GameComponentProps {
  roomId: string;
  currentUserId: string;
  players: Array<{
    uid: string;
    symbol: string;
    displayName: string;
    photoURL: string | null;
  }>;
  isHost: boolean;
  onGameFinished: (winnerId: string | null, isDraw: boolean) => Promise<void>;
}

export interface GameEngine<TState = unknown> {
  readonly id: string;
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly description: string;
  readonly initialSymbolPool: readonly string[];

  getInitialState(): TState;
  validateMove(state: TState, move: GameMove): boolean;
  applyMove(state: TState, move: GameMove): TState;
  checkResult(state: TState, players: Array<{ uid: string; symbol: string }>): GameResult;
}

export interface GameDefinition<TState = unknown> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  component: ComponentType<GameComponentProps>;
  engine: GameEngine<TState>;
  syncStrategy: 'firestore' | 'rtdb' | 'hybrid';
}
