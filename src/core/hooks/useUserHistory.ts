import { useEffect, useState } from 'react';
import { subscribeUserHistory } from '../services/historyService';
import type { GameHistoryEntry } from '../services/historyService';

export function useUserHistory(uid: string | null, max = 20) {
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeUserHistory(
      uid,
      (e) => {
        setEntries(e);
        setLoading(false);
      },
      max
    );
    return unsubscribe;
  }, [uid, max]);

  return { entries, loading, error };
}
