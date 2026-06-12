import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { UserStats, LeaderboardEntry } from '../services/statsService';

export function subscribeLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void,
  topN = 20
): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    orderBy('wins', 'desc'),
    limit(topN)
  );
  return onSnapshot(q, (snapshot) => {
    const entries: LeaderboardEntry[] = snapshot.docs.map((d) => {
      const data = d.data() as UserStats;
      const winRate =
        data.totalGames > 0 ? Math.round((data.wins / data.totalGames) * 100) : 0;
      return { ...data, winRate };
    });
    callback(entries);
  });
}

export function useLeaderboard(topN = 20) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeLeaderboard(
      (e) => {
        setEntries(e);
        setLoading(false);
      },
      topN
    );
    return () => {
      unsubscribe();
    };
  }, [topN]);

  return { entries, loading, error };
}
