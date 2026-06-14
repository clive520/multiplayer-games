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
  /**
   * 教學步驟：依序顯示在「怎麼玩」對話框中
   * MVP 暫未實作 dialog，僅作為 metadata 預備
   */
  tutorialSteps?: string[];
  /**
   * 預估一局時間（分鐘）：顯示在大廳房間卡片
   */
  estimatedDurationMin?: number;
  /**
   * 遊戲變體列表：為 #14 房間設定擴充預留
   * MVP 沒遊戲使用，未來可在 Lobby 顯示變體選擇器
   */
  variants?: GameVariant[];
}

/**
 * 遊戲變體：例如五子棋可有 13x13 / 19x19 / Renju 禁手規則等變體
 * config 由各遊戲自己解釋，型別用 Record<string, unknown> 保持彈性
 */
export interface GameVariant {
  id: string;
  name: string;
  description: string;
  config?: Record<string, unknown>;
}
