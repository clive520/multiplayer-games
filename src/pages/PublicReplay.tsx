import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../core/auth/useAuth';
import {
  subscribeHistoryEntry,
  saveHistoryEntry,
  unlinkUserFromHistory,
} from '../core/services/historyService';
import {
  isFavorited,
  addFavorite,
  removeFavorite,
} from '../core/services/favoritesService';
import type { GameHistoryEntry } from '../core/types/history';
import { ReplayBoard } from '../core/components/ReplayBoard';
import { getReplayRenderers } from '../core/utils/replayRenderers';
import { useToast } from '../core/components/Toast';
import { gameRegistry } from '@/registry';
import type { GameType } from '../core/types/room';

/**
 * 公開棋譜詳情頁（IMPROVEMENTS #22 Phase 1+2+3）
 *
 * - /history/:entryId
 * - 任何登入者都可以看（gameHistory 是 public）
 * - 「儲存 / 刪除」= 操作自己的 savedGameHistory link
 * - 「加到 / 取消最愛」= 操作自己的 favoriteGameHistory link
 */
export default function PublicReplay() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [entry, setEntry] = useState<GameHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);

  // 訂閱棋譜
  useEffect(() => {
    if (!entryId) return;
    setLoading(true);
    const unsubscribe = subscribeHistoryEntry(entryId, (e) => {
      setEntry(e);
      setLoading(false);
    });
    return unsubscribe;
  }, [entryId]);

  // 檢查目前使用者是否已儲存 / 加到最愛
  useEffect(() => {
    if (!user || !entryId) return;
    void isFavorited(user.uid, entryId).then(setIsFav);
    // 檢查 saved 不直接 call historyService（避免額外訂閱）
    // 簡化：進來時 query 一次
    void import('../core/services/historyService').then(({ getUserSavedLinks }) => {
      void getUserSavedLinks(user.uid).then((links) => {
        setIsSaved(links.some((l) => l.entryId === entryId));
      });
    });
  }, [user, entryId]);

  const handleSave = useCallback(async () => {
    if (!user || !entry) return;
    setBusy(true);
    try {
      if (isSaved) {
        await unlinkUserFromHistory(user.uid, entry.id);
        setIsSaved(false);
        toast.info(t('publicReplay.removeFromMine'));
      } else {
        await saveHistoryEntry(user.uid, entry);
        setIsSaved(true);
        toast.success(t('publicReplay.saved'));
      }
    } catch (err) {
      console.error('儲存棋譜失敗', err);
      toast.error(err instanceof Error ? err.message : t('publicReplay.loadFailed'));
    } finally {
      setBusy(false);
    }
  }, [user, entry, isSaved, t, toast]);

  const handleFavorite = useCallback(async () => {
    if (!user || !entry) return;
    setBusy(true);
    try {
      if (isFav) {
        await removeFavorite(user.uid, entry.id);
        setIsFav(false);
        toast.info(t('publicReplay.removeFavorite'));
      } else {
        await addFavorite(user.uid, entry.id);
        setIsFav(true);
        toast.success(t('publicReplay.addFavorite'));
      }
    } catch (err) {
      console.error('切換最愛失敗', err);
      toast.error(err instanceof Error ? err.message : t('publicReplay.loadFailed'));
    } finally {
      setBusy(false);
    }
  }, [user, entry, isFav, t, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="dark:text-slate-400 text-slate-600">{t('publicReplay.loading')}</p>
      </div>
    );
  }
  if (!entry) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-6">
        <p className="dark:text-slate-300 text-slate-700">{t('publicReplay.notFound')}</p>
        <Link
          to="/profile"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          {t('publicReplay.back')}
        </Link>
      </div>
    );
  }

  const { boardSize, boardClassName, renderCell, maxCellPx } = getReplayRenderers(entry.gameType as GameType);
  const Icon = gameRegistry.find((g) => g.id === entry.gameType)?.icon;
  const isOwnEntry = entry.playerUids.includes(user?.uid ?? '');

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong"
        >
          ← {t('publicReplay.back')}
        </button>
        {Icon && <Icon className="h-8 w-8 dark:text-slate-200 text-slate-800" />}
        <h1 className="text-xl font-bold">{t('publicReplay.title')}</h1>
        {entry.hasAI && (
          <span className="rounded bg-purple-900/40 px-2 py-0.5 text-xs text-purple-200">AI</span>
        )}
      </header>

      {/* 對局資訊卡片 */}
      <section className="mb-4 rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4">
        <h2 className="mb-2 text-sm font-semibold dark:text-slate-300 text-slate-700">
          {t('publicReplay.players')}
        </h2>
        <ul className="space-y-1 text-sm">
          {entry.playerUids.map((uid) => (
            <li key={uid} className="flex items-center gap-2">
              <span className="font-medium dark:text-white text-slate-900">
                {entry.playerNames[uid] ?? '?'}
              </span>
              {uid === user?.uid && (
                <span className="text-xs dark:text-slate-400 text-slate-600">（{t('common.you')}）</span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t dark:border-slate-700 border-app-border pt-3 text-sm">
          <div>
            <p className="text-xs dark:text-slate-400 text-slate-600">{t('publicReplay.startedAt')}</p>
            <p className="font-mono">{new Date(entry.startedAt).toLocaleString('zh-TW')}</p>
          </div>
          <div>
            <p className="text-xs dark:text-slate-400 text-slate-600">{t('publicReplay.endedAt')}</p>
            <p className="font-mono">{new Date(entry.endedAt).toLocaleString('zh-TW')}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 border-t dark:border-slate-700 border-app-border pt-3 text-sm">
          <span className="text-xs dark:text-slate-400 text-slate-600">{t('publicReplay.result')}</span>
          {entry.isDraw ? (
            <span className="font-semibold dark:text-slate-300 text-slate-700">和局</span>
          ) : (
            <span className="font-semibold text-yellow-400">
              🏆 {entry.playerNames[entry.winnerId ?? ''] ?? '?'}
            </span>
          )}
        </div>
      </section>

      {/* 復盤 */}
      <section className="mb-4">
        <ReplayBoard
          moves={entry.moves}
          initialBoard={entry.initialBoard}
          boardSize={boardSize}
          boardClassName={boardClassName}
          renderCell={renderCell}
          maxCellPx={maxCellPx}
        />
        {entry.truncated && (
          <p className="mt-1 text-center text-xs text-yellow-400">
            ⚠️ {t('profile.truncated')}（{t('profile.totalMoves', { count: entry.totalMoves })}）
          </p>
        )}
      </section>

      {/* 操作列 */}
      <section className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !user}
          className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            isSaved
              ? 'dark:bg-slate-700 bg-app-hover dark:text-slate-200 text-slate-800 hover:dark:bg-slate-600 bg-app-border-strong'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {isSaved
            ? (isOwnEntry ? t('publicReplay.saved') : `✓ ${t('publicReplay.saved')}`)
            : t('publicReplay.saveToMine')}
        </button>
        <button
          type="button"
          onClick={handleFavorite}
          disabled={busy || !user}
          className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            isFav
              ? 'bg-pink-600 text-white'
              : 'dark:bg-slate-700 bg-app-hover dark:text-slate-200 text-slate-800 hover:dark:bg-slate-600 bg-app-border-strong'
          }`}
        >
          {isFav ? `❤️ ${t('publicReplay.removeFavorite')}` : `🤍 ${t('publicReplay.addFavorite')}`}
        </button>
      </section>
    </div>
  );
}
