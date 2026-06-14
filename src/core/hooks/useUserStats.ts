import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { UserStats, LeaderboardEntry } from '../services/statsService';
import { calculateWinRate, DEFAULT_GAME_STATS } from '../services/statsService';

export function subscribeUserStats(uid: string, callback: (stats: UserStats | null) => void): Unsubscribe {
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      // 向後相容：優先讀 nickname（玩家自設），fallback 到 displayName（舊資料 = Google 名）
      const nickname = (data.nickname as string) ?? (data.displayName as string) ?? '';
      callback({
        uid,
        nickname,
        displayName: nickname,
        photoURL: (data.photoURL as string | null) ?? null,
        overall: data.overall ?? DEFAULT_GAME_STATS,
        byGame: data.byGame ?? {
          tictactoe: { ...DEFAULT_GAME_STATS },
          gomoku: { ...DEFAULT_GAME_STATS },
        },
        updatedAt: (data.updatedAt as number) ?? 0,
      });
    },
    () => {
      callback(null);
    }
  );
}

export function useUserStats(uid: string | null) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeUserStats(uid, (s) => {
      setStats(s);
      setLoading(false);
    });
    return () => {
      unsubscribe();
    };
  }, [uid]);

  return { stats, loading, error };
}

export function buildLeaderboardEntry(stats: UserStats, scope: 'overall' | 'tictactoe' | 'gomoku'): LeaderboardEntry {
  const gameStats = scope === 'overall' ? stats.overall : stats.byGame[scope];
  return {
    ...stats,
    winRate: calculateWinRate(gameStats),
  };
}
