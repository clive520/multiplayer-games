export type GameType = 'tictactoe' | 'gomoku' | 'reversi';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type PlayerSymbol = string;

/** 房主可設定的每回合思考時間（秒） */
export type TurnTimeLimit = 30 | 60 | 120 | 150;
export const TURN_TIME_LIMITS: readonly TurnTimeLimit[] = [30, 60, 120, 150] as const;
export const DEFAULT_TURN_TIME_LIMIT: TurnTimeLimit = 30;

export function isValidTurnTimeLimit(value: unknown): value is TurnTimeLimit {
  return value === 30 || value === 60 || value === 120 || value === 150;
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
}
