export type GameType = 'tictactoe' | 'gomoku' | 'reversi';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type PlayerSymbol = string;

/** 房主可設定的每回合思考時間（秒） */
export type TurnTimeLimit = 15 | 30 | 45 | 60 | 90 | 120 | 150 | 180;
export const TURN_TIME_LIMITS: readonly TurnTimeLimit[] = [15, 30, 45, 60, 90, 120, 150, 180] as const;
export const DEFAULT_TURN_TIME_LIMIT: TurnTimeLimit = 30;

export function isValidTurnTimeLimit(value: unknown): value is TurnTimeLimit {
  return value === 15 || value === 30 || value === 45 || value === 60
    || value === 90 || value === 120 || value === 150 || value === 180;
}

export interface RoomPlayer {
  uid: string;
  displayName: string;
  photoURL: string | null;
  symbol: PlayerSymbol;
  ready: boolean;
  isHost: boolean;
}

export interface Spectator {
  uid: string;
  nickname: string;
  photoURL: string | null;
  joinedAt: number;
}

export interface Room {
  id: string;
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  playerUids: string[];
  spectators: Spectator[];
  spectatorUids: string[];
  hasPassword: boolean;
  createdAt: number;
  lastActivityAt: number;
  startedAt: number | null;
  endedAt: number | null;
  winnerId: string | null;
  isDraw: boolean;
  turnStartedAt: number | null;
  turnSymbol: string | null;
  turnTimeLimitSec: TurnTimeLimit;
  /**
   * IMPROVEMENTS #12 悔棋限額：每個玩家這場用了幾次悔棋額度
   * 預設 0；達到 1 就不能再發起悔棋（之後可由 #14 房間設定擴充）
   */
  undoUsedByUids?: Record<string, number>;
}

export interface RoomSummary {
  id: string;
  code: string;
  gameType: GameType;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  status: RoomStatus;
  hasPassword: boolean;
  createdAt: number;
  turnTimeLimitSec: TurnTimeLimit;
  /** IMPROVEMENTS #9：是否為對戰電腦房（AI 房不出現在公開大廳） */
  isAIRoom?: boolean;
}
