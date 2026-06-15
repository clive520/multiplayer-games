import { useEffect, useState } from 'react';
import { subscribeUserSavedLinks, getHistoryEntriesByIds } from '../services/historyService';
import type { SavedHistoryLink, GameHistoryEntry } from '../types/history';

/**
 * 訂閱「我的棋譜」列表（IMPROVEMENTS #22 Phase 1）
 *
 * 設計：先訂閱 savedGameHistory 子集合（極小、只存連結），
 * 再用 entryIds 批次查詢 gameHistory（用 savedLinks 內的快照 metadata 立即渲染）。
 *
 * 為什麼不直接 query gameHistory：避免每次渲染時要重新發 query。
 */
export function useUserHistory(uid: string | null, max = 50) {
  const [links, setLinks] = useState<SavedHistoryLink[]>([]);
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 訂閱 saved links
  useEffect(() => {
    if (!uid) {
      setLinks([]);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeUserSavedLinks(uid, (l) => {
      setLinks(l);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  // 根據 links 載入 entries
  useEffect(() => {
    if (links.length === 0) {
      setEntries([]);
      return;
    }
    const ids = links
      .sort((a, b) => b.linkedAt - a.linkedAt)
      .slice(0, max)
      .map((l) => l.entryId);
    getHistoryEntriesByIds(ids)
      .then((es) => {
        // 依 linkedAt 排序
        const entryMap = new Map(es.map((e) => [e.id, e]));
        const sorted = ids
          .map((id) => entryMap.get(id))
          .filter((e): e is GameHistoryEntry => !!e);
        setEntries(sorted);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))));
  }, [links, max]);

  return { links, entries, loading, error };
}
