import { useEffect, useState } from 'react';
import { subscribeUserFavorites } from '../services/favoritesService';
import { getHistoryEntriesByIds } from '../services/historyService';
import type { FavoriteLink, GameHistoryEntry } from '../types/history';

/**
 * 訂閱「我的最愛」列表（IMPROVEMENTS #22 Phase 3）
 *
 * 設計：先訂閱 favoriteGameHistory 子集合（極小、只存連結），
 * 再用 entryIds 批次查詢 gameHistory。
 */
export function useUserFavorites(uid: string | null) {
  const [links, setLinks] = useState<FavoriteLink[]>([]);
  const [favorites, setFavorites] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setLinks([]);
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeUserFavorites(uid, (l) => {
      setLinks(l);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (links.length === 0) {
      setFavorites([]);
      return;
    }
    const ids = links
      .sort((a, b) => b.favoritedAt - a.favoritedAt)
      .map((l) => l.entryId);
    getHistoryEntriesByIds(ids)
      .then((es) => {
        const entryMap = new Map(es.map((e) => [e.id, e]));
        const sorted = ids
          .map((id) => entryMap.get(id))
          .filter((e): e is GameHistoryEntry => !!e);
        setFavorites(sorted);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))));
  }, [links]);

  return { links, favorites, loading, error };
}
