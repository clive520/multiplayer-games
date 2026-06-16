import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  searchHistory,
  subscribeLatestHistory,
  type HistorySearchFilters,
} from '../core/services/historyService';
import type { GameHistoryEntry } from '../core/types/history';
import { gameRegistry } from '@/registry';
import type { GameType } from '../core/types/room';

/**
 * 公開棋譜探索頁（IMPROVEMENTS #22 Phase 2）
 *
 * - /explore
 * - 列出所有公開棋譜
 * - 篩選：遊戲類型 / 是否包含 AI
 * - 點進 → /history/:entryId（PublicReplay）
 */
export default function Explore() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [filterGame, setFilterGame] = useState<GameType | 'all'>('all');
  const [filterAI, setFilterAI] = useState<'all' | 'no-ai' | 'with-ai'>('no-ai');
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const filters: HistorySearchFilters = { pageSize: 30 };
      if (filterGame !== 'all') filters.gameType = filterGame;
      if (filterAI === 'no-ai') filters.hasAI = false;
      if (filterAI === 'with-ai') filters.hasAI = true;
      // hasAI === undefined 時不過濾
      const { entries: list } = await searchHistory(filters);
      setEntries(list);
    } catch (err) {
      console.error('載入棋譜失敗', err);
    } finally {
      setLoading(false);
    }
  }, [filterGame, filterAI]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // 訂閱最新公開棋譜（real-time）
  useEffect(() => {
    if (filterGame !== 'all' || filterAI !== 'all') return; // 只在無篩選時訂閱
    const unsubscribe = subscribeLatestHistory((list) => {
      setEntries(list);
      setLoading(false);
    });
    return unsubscribe;
  }, [filterGame, filterAI]);

  const navigate = useNavigate();

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
          {(['all', 'tictactoe', 'gomoku', 'reversi'] as const).map((gt) => (
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
              {ai === 'all'
                ? '全部 AI'
                : ai === 'no-ai'
                  ? t('explore.filterHideAI')
                  : t('explore.filterShowAI')}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed dark:border-slate-700 border-app-border p-8 text-center text-slate-500">
          {t('explore.empty')}
        </div>
      ) : (
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
      )}
    </div>
  );
}
