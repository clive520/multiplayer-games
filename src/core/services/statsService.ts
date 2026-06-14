import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { GameType } from '../types/room';

export interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}

export const DEFAULT_GAME_STATS: GameStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  totalGames: 0,
};

export interface UserStats {
  uid: string;
  nickname: string;
  displayName: string;
  photoURL: string | null;
  overall: GameStats;
  byGame: {
    tictactoe: GameStats;
    gomoku: GameStats;
    reversi: GameStats;
  };
  updatedAt: number;
}

export interface LeaderboardEntry extends UserStats {
  winRate: number;
}

export function getGameStats(user: UserStats, gameType: GameType | 'overall'): GameStats {
  if (gameType === 'overall') return user.overall ?? DEFAULT_GAME_STATS;
  return user.byGame?.[gameType] ?? DEFAULT_GAME_STATS;
}

export function calculateWinRate(stats: GameStats): number {
  if (stats.totalGames === 0) return 0;
  return Math.round((stats.wins / stats.totalGames) * 100);
}

function emptyByGame(): UserStats['byGame'] {
  return {
    tictactoe: { ...DEFAULT_GAME_STATS },
    gomoku: { ...DEFAULT_GAME_STATS },
    reversi: { ...DEFAULT_GAME_STATS },
  };
}

export async function ensureUserStats(_uid: string): Promise<void> {
  // 此函式保留供向後相容；新巢狀結構下 recordGameResult 會自動建立文件
}

export async function recordGameResult(args: {
  gameType: GameType;
  winnerId: string | null;
  isDraw: boolean;
  players: Array<{ uid: string; nickname: string; photoURL: string | null }>;
}): Promise<void> {
  const { gameType, winnerId, isDraw, players } = args;
  const now = Date.now();

  const updates = players.map((p) => {
    const ref = doc(db, 'users', p.uid);
    const isWinner = !isDraw && p.uid === winnerId;
    const delta = isDraw
      ? { wins: 0, losses: 0, draws: 1, totalGames: 1 }
      : isWinner
        ? { wins: 1, losses: 0, draws: 0, totalGames: 1 }
        : { wins: 0, losses: 1, draws: 0, totalGames: 1 };

    return updateDoc(ref, {
      'overall.wins': increment(delta.wins),
      'overall.losses': increment(delta.losses),
      'overall.draws': increment(delta.draws),
      'overall.totalGames': increment(delta.totalGames),
      [`byGame.${gameType}.wins`]: increment(delta.wins),
      [`byGame.${gameType}.losses`]: increment(delta.losses),
      [`byGame.${gameType}.draws`]: increment(delta.draws),
      [`byGame.${gameType}.totalGames`]: increment(delta.totalGames),
      nickname: p.nickname,
      displayName: p.nickname,
      photoURL: p.photoURL,
      updatedAt: now,
    }).catch(async (err) => {
      if (err.code === 'not-found') {
        // 第一次玩此遊戲，建立使用者文件（含完整初始結構）
        const initial: any = {
          uid: p.uid,
          nickname: p.nickname,
          displayName: p.nickname,
          photoURL: p.photoURL,
          isCustomNickname: false,
          overall: { ...DEFAULT_GAME_STATS },
          byGame: emptyByGame(),
          createdAt: serverTimestamp(),
          updatedAt: now,
        };
        initial.overall.wins = delta.wins;
        initial.overall.losses = delta.losses;
        initial.overall.draws = delta.draws;
        initial.overall.totalGames = delta.totalGames;
        initial.byGame[gameType] = { ...delta };
        await setDoc(ref, initial);
      } else {
        throw err;
      }
    });
  });
  await Promise.all(updates);
}
