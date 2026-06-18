import type { ComponentType } from 'react';

export interface GameMove {
  playerId: string;
  payload: unknown;
  timestamp: number;
}

/**
 * 棋譜中的一步紀錄：存於 game state 的 `moves` 陣列中
 * 供 GameRoom 的「棋譜面板」顯示
 *
 * 欄位：
 * - row, col：落子座標
 * - symbol：棋子符號（'X' | 'O'，由遊戲自訂）
 * - uid, displayName：下棋者（snapshot，避免日後改名影響棋譜）
 * - timestamp：時間戳
 * - flipped（選填，reversi 用）：這步翻的棋子座標列表
 * - boardAfter（IMPROVEMENTS #12 Phase B 復盤）：這步下完後的完整棋盤快照
 *   - 為存儲效率，用字串陣列（'X' / 'O' / ''）而非二維陣列
 *   - 缺失時 ReplayBoard 會 fallback 顯示「資料過舊」訊息
 */
export interface MoveRecord {
  row: number;
  col: number;
  symbol: string;
  uid: string;
  displayName: string;
  timestamp: number;
  flipped?: ReadonlyArray<{ row: number; col: number }>;
  boardAfter?: ReadonlyArray<string>;
  /**
   * 遊戲自訂附加資料（IMPROVEMENTS #12 + 5th 遊戲 Dots and Boxes）
   * - dotsandboxes 用 `{ type: 'h' | 'v' }` 標記這步畫的是水平還是垂直邊
   * - 其他遊戲不需要這個欄位
   */
  metadata?: Readonly<Record<string, unknown>>;
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
  /**
   * AI 對手引擎（IMPROVEMENTS #9）：選填；沒提供就無法對戰電腦
   * 型別故意用寬鬆版本（unknown）避免循環依賴，runtime 由 AIEngineCreator 判斷
   */
  aiEngine?: import('./ai').AIEngineCreator;
  /**
   * IMPROVEMENTS #12 悔棋：接受對方悔棋請求（每個遊戲自己實作）
   * 因為不同遊戲的 state 結構不同，revert 邏輯也不同
   * 沒提供就不支援悔棋（例如未來加的新遊戲可以暫不支援）
   */
  acceptUndo?: (roomId: string, requesterUid: string) => Promise<{ applied: boolean; reason?: string; newTurnSymbol?: string }>;
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
