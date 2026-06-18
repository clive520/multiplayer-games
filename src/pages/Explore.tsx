import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DocumentSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import {
  searchHistory,
  subscribeLatestHistory,
  type HistorySearchFilters,
} from '../core/services/historyService';
import type { GameHistoryEntry } from '../core/types/history';
import { gameRegistry } from '@/registry';
import type { GameType } from '../core/types/room';

/** IMPROVEMENTS 從 registry 自動產生篩選選項（新增遊戲自動包含） */
const FILTER_GAME_OPTIONS: ReadonlyArray<GameType | 'all'> = [
  'all',
  ...gameRegistry.map((g) => g.id as GameType),
];

/** 每頁筆數（IMPROVEMENTS Explore 分頁） */
const PAGE_SIZE = 50;

/**
 * 公開棋譜探索頁（IMPROVEMENTS #22 Phase 2 + 分頁）
 *
 * - /explore
 * - 列出所有公開棋譜
 * - 篩選：遊戲類型 / 是否包含 AI
 * - 預設載入前 50 筆，點「載入更多」再取下 50 筆（cursor 分頁）
 * - 點進 → /history/:entryId（PublicReplay）
 */
export default function Explore() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filterGame, setFilterGame] = useState<GameType | 'all'>('all');
  const [filterAI, setFilterAI] = useState<'all' | 'no-ai' | 'with-ai'>('no-ai');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置並載入第一頁
  const resetAndLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: HistorySearchFilters = { pageSize: PAGE_SIZE };
      if (filterGame !== 'all') filters.gameType = filterGame;
      if (filterAI === 'no-ai') filters.hasAI = false;
      if (filterAI === 'with-ai') filters.hasAI = true;
      const { entries: list, nextCursor } = await searchHistory(filters);
      setEntries(list);
      setCursor(nextCursor);
      // 如果回傳筆數 == pageSize，可能還有下一頁
      setHasMore(list.length === PAGE_SIZE && nextCursor !== null);
    } catch (err) {
      console.error('載入棋譜失敗', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [filterGame, filterAI]);

  // 載入下一頁（用 cursor）
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const filters: HistorySearchFilters = { pageSize: PAGE_SIZE, cursor };
      if (filterGame !== 'all') filters.gameType = filterGame;
      if (filterAI === 'no-ai') filters.hasAI = false;
      if (filterAI === 'with-ai') filters.hasAI = true;
      const { entries: list, nextCursor } = await searchHistory(filters);
      setEntries((prev) => [...prev, ...list]);
      setCursor(nextCursor);
      setHasMore(list.length === PAGE_SIZE && nextCursor !== null);
    } catch (err) {
      console.error('載入更多失敗', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, filterGame, filterAI, loadingMore]);

  // 篩選變更 → 重置並重新載入
  useEffect(() => {
    void resetAndLoad();
  }, [resetAndLoad]);

  // 訂閱最新公開棋譜（real-time，僅無篩選時）
  useEffect(() => {
    if (filterGame !== 'all' || filterAI !== 'all') return;
    const unsubscribe = subscribeLatestHistory((list) => {
      setEntries(list);
      setLoading(false);
      setCursor(null);
      setHasMore(list.length === PAGE_SIZE);
    });
    return unsubscribe;
  }, [filterGame, filterAI]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('explore.title')}</h1>
          <p className="text-sm dark:text-slate-400 text-slate-600">{t('explore.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/lobby')}
          className="shrink-0 rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
        >
          ← {t('profile.backToLobby')}
        </button>
      </header>

      {/* 篩選器 */}
      <section className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg dark:bg-slate-800 bg-app-card p-1">
          {FILTER_GAME_OPTIONS.map((gt) => (
            <button
              key={gt}
              type="button"
              onClick={() => setFilterGame(gt)}
              className={`rounded px-3 py-1 text-sm transition ${
                filterGame === gt
                  ? 'bg-blue-600 text-white'
                  : 'dark:text-slate-300 text-slate-700 hover:dark:bg-slate-700 hover:bg-slate-50'
              }`}
            >
              {gt === 'all' ? t('explore.filterAll') : t(`explore.filter${gt.charAt(0).toUpperCase()}${gt.slice(1)}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg dark:bg-slate-800 bg-app-card p-1">
          {(['all', 'no-ai', 'with-ai'] as const).map((ai) => (
            <button
              key={ai}
              type="button"
              onClick={() => setFilterAI(ai)}
              className={`rounded px-3 py-1 text-sm transition ${
                filterAI === ai
                  ? 'bg-blue-600 text-white'
                  : 'dark:text-slate-300 text-slate-700 hover:dark:bg-slate-700 hover:bg-slate-50'
              }`}
            >
              {ai === 'all' ? t('explore.filterAllAI') : ai === 'no-ai' ? t('explore.filterHideAI') : t('explore.filterShowAI')}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="mb-3 rounded border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed dark:border-slate-700 border-app-border p-8 text-center text-slate-500">
          {t('explore.empty')}
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {entries.map((e) => {
              const Icon = gameRegistry.find((g) => g.id === e.gameType)?.icon;
              const opponentNames = e.playerUids
                .map((u) => e.playerNames[u] ?? '?')
                .join(' vs ');
              return (
                <li
                  key={e.id}
                  data-testid="explore-row"
                  className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card"
                >
                  <Link
                    to={`/history/${e.id}`}
                    className="flex items-center gap-3 p-3 transition hover:dark:border-slate-500 hover:border-app-border-strong"
                  >
                    {Icon && <Icon className="h-8 w-8 dark:text-slate-200 text-slate-800" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{opponentNames}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(e.endedAt).toLocaleString('zh-TW')} · {t('profile.totalMoves', { count: e.totalMoves })}
                      </p>
                    </div>
                    {e.isDraw ? (
                      <span className="rounded dark:bg-slate-700 bg-app-hover px-2 py-0.5 text-xs">和</span>
                    ) : e.winnerId ? (
                      <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-300">
                        🏆 {e.playerNames[e.winnerId] ?? '?'}
                      </span>
                    ) : null}
                    {e.hasAI && (
                      <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-xs text-purple-200">
                        AI
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 分頁：載入更多按鈕（IMPROVEMENTS Explore） */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-lg dark:bg-slate-700 bg-app-hover px-6 py-2 text-sm font-medium dark:text-slate-200 text-slate-800 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
              >
                {loadingMore ? t('common.loading') : `${t('explore.loadMore')}（已顯示 ${entries.length} 筆）`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
