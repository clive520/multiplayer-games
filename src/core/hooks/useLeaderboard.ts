import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { UserStats, LeaderboardEntry, GameStats } from '../services/statsService';
import { calculateWinRate, DEFAULT_GAME_STATS } from '../services/statsService';
import type { GameType } from '../types/room';

export type LeaderboardScope = 'overall' | GameType;

export function subscribeLeaderboard(
  scope: LeaderboardScope,
  callback: (entries: LeaderboardEntry[]) => void,
  topN = 20
): Unsubscribe {
  // IMPROVEMENTS #10：排序改用 ELO（更反映真實強度），降序
  const eloField = scope === 'overall' ? 'overall.elo' : `byGame.${scope}.elo`;

  const q = query(
    collection(db, 'users'),
    orderBy(eloField, 'desc'),
    limit(Math.max(topN, 60))
  );
  return onSnapshot(q, (snapshot) => {
    const entries: LeaderboardEntry[] = snapshot.docs
      .map((d) => {
        const data = d.data() as UserStats;
        const stats: GameStats = scope === 'overall'
          ? (data.overall ?? DEFAULT_GAME_STATS)
          : (data.byGame?.[scope as GameType] ?? DEFAULT_GAME_STATS);
        return {
          ...data,
          overall: data.overall ?? DEFAULT_GAME_STATS,
          byGame: data.byGame ?? {
            tictactoe: { ...DEFAULT_GAME_STATS },
            gomoku: { ...DEFAULT_GAME_STATS },
            reversi: { ...DEFAULT_GAME_STATS },
            connect4: { ...DEFAULT_GAME_STATS },
            dotsandboxes: { ...DEFAULT_GAME_STATS },
            mancala: { ...DEFAULT_GAME_STATS },
          },
          winRate: calculateWinRate(stats),
        };
      })
      .filter((e) => {
        // 過濾掉該類別下完全沒玩過的玩家（totalGames=0 表示新用戶）
        const total = scope === 'overall' ? e.overall.totalGames : e.byGame[scope as GameType].totalGames;
        return total > 0;
      })
      .slice(0, topN);
    callback(entries);
  });
}

export function useLeaderboard(scope: LeaderboardScope, topN = 20) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeLeaderboard(
      scope,
      (e) => {
        setEntries(e);
        setLoading(false);
      },
      topN
    );
    return () => {
      unsubscribe();
    };
  }, [scope, topN]);

  return { entries, loading, error };
}
