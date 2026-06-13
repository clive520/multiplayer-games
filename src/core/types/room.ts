export type GameType = 'tictactoe' | 'gomoku';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type PlayerSymbol = string;

export interface RoomPlayer {
  uid: string;
  displayName: string;
  photoURL: string | null;
  symbol: PlayerSymbol;
  ready: boolean;
  isHost: boolean;
}

export interface Room {
  id: string;
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  playerUids: string[];
  hasPassword: boolean;
  createdAt: number;
  lastActivityAt: number;
  startedAt: number | null;
  endedAt: number | null;
  winnerId: string | null;
  isDraw: boolean;
}

export interface RoomSummary {
  id: string;
  code: string;
  gameType: GameType;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  hasPassword: boolean;
  createdAt: number;
}
