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
  isSpectator?: boolean;
  turnSecondsLeft?: number | null;
  turnTimeLimitSec?: number;
  turnSymbol?: string | null;
  formatSymbol?: (symbol: string) => string;
  onGameFinished: (winnerId: string | null, isDraw: boolean) => Promise<void>;
  onActivity?: () => void;
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
  /**
   * 動態載入遊戲 React 元件：進入 GameRoom 時才 fetch 對應的 chunk，
   * 避免所有遊戲程式碼塞進 initial bundle。
   * 範例：`loadComponent: () => import('./TicTacToe').then(m => m.default)`
   */
  loadComponent: () => Promise<ComponentType<GameComponentProps>>;
  engine: GameEngine<TState>;
  syncStrategy: 'firestore' | 'rtdb' | 'hybrid';
  icon: ComponentType<{ className?: string }>;
  formatSymbol?: (symbol: string) => string;
}
