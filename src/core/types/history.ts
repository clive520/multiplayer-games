/**
 * 棋譜歷史（IMPROVEMENTS #22 棋譜分享 / 公開）
 *
 * 設計原則：
 * - 棋譜本體 `GameHistoryEntry` 一旦建立就**永久存在**（除非 TTL 清掉）
 * - 「我的棋譜」= `users/{uid}/savedGameHistory` 子集合（連結，不是副本）
 * - 「刪除」= 解開連結，棋譜本體仍存在
 * - 「我的最愛」= `users/{uid}/favoriteGameHistory` 子集合（獨立於 saved）
 *
 * 儲存策略（IMPROVEMENTS #22 Phase 4）：
 * - 每局 moves 上限：井字 9 / 五子棋 100 / 黑白棋 80
 * - 超出截斷 + UI 標示「棋譜太長，僅顯示前 N 步」
 * - 每使用者 saved 上限 200（超出時移除最舊）
 * - （未做）TTL 90 天 for 未加最愛的 entry
 */

import type { GameType } from './room';
import type { MoveRecord } from './game';

/** 棋譜儲存時的 moves 上限（依遊戲類型） */
export const MOVES_CAP: Record<GameType, number> = {
  tictactoe: 9,    // 棋盤只有 9 格
  gomoku: 100,     // 超過通常接近平局
  reversi: 80,     // 棋盤填滿也只 60 步
};

/** 每人 saved link 上限 */
export const SAVED_HISTORY_PER_USER_CAP = 200;

/** 「我儲存了這棋譜」連結（刪除 = 刪這個 doc） */
export type SavedSource = 'auto' | 'manual';
export type SavedOutcome = 'win' | 'lose' | 'draw' | 'spectator';

export interface SavedHistoryLink {
  entryId: string;
  /** 我在這局的符號（觀戰者為 null） */
  yourSymbol: 'X' | 'O' | null;
  /** 我在這局的結果（用於列表顯示） */
  yourOutcome: SavedOutcome;
  linkedAt: number;
  /** auto = 對局結束時系統加 / manual = 自己手動加（探索頁） */
  source: SavedSource;
}

/** 「我的最愛」連結（toggle 即可） */
export interface FavoriteLink {
  entryId: string;
  favoritedAt: number;
}

/** 棋譜本體（公開、可被任何登入者讀取） */
export interface GameHistoryEntry {
  id: string;
  /** 原始 Firestore 房間 doc ID（房間可能已被清理） */
  roomId: string;
  gameType: GameType;
  startedAt: number;
  endedAt: number;
  winnerId: string | null;
  isDraw: boolean;
  /** 玩家 UID 列表（不含觀戰者） */
  playerUids: string[];
  /** 玩家名稱快照（避免日後改名） */
  playerNames: Record<string, string>;
  /** 觀戰者 UID 列表（可空陣列） */
  spectatorUids: string[];
  /** 完整棋譜（含 boardAfter） */
  moves: MoveRecord[];
  /** 起始棋盤（給 ReplayBoard 顯示第 0 步用） */
  initialBoard: string[];
  totalMoves: number;
  /** moves 是否被截斷（超過 MOVES_CAP） */
  truncated: boolean;
  createdAt: number;
  /** 對局中是否包含 AI 玩家（IMPROVEMENTS #9） */
  hasAI: boolean;
}
