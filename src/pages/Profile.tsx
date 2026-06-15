import { useEffect, useState, type FormEvent, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../core/auth/useAuth';
import { useUserHistory } from '../core/hooks/useUserHistory';
import { useUserFavorites } from '../core/hooks/useUserFavorites';
import { useUserStats } from '../core/hooks/useUserStats';
import { signOut } from '../core/auth/googleSignIn';
import { calculateWinRate, getGameStats } from '../core/services/statsService';
import { updateNickname, validateNickname } from '../core/services/profileService';
import { isDefaultNicknameFormat } from '../core/types/user';
import { gameRegistry } from '@/registry';
import type { GameHistoryEntry } from '../core/types/history';
import type { GameType } from '../core/types/room';

const GAME_LABELS: Record<GameType, string> = {
  tictactoe: 'games.tictactoe.name',
  gomoku: 'games.gomoku.name',
  reversi: 'games.reversi.name',
};

type IconComponent = ComponentType<{ className?: string }>;
const GAME_ICONS: Record<GameType, IconComponent> = {
  tictactoe: gameRegistry.find((g) => g.id === 'tictactoe')!.icon,
  gomoku: gameRegistry.find((g) => g.id === 'gomoku')!.icon,
  reversi: gameRegistry.find((g) => g.id === 'reversi')!.icon,
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// TFunction from i18next — accepts key + optional interpolation object
type TFunction = (key: string, options?: Record<string, unknown>) => string;

function describeResult(entry: GameHistoryEntry, uid: string, t: TFunction): { text: string; color: string } {
  if (entry.isDraw) return { text: t('profile.resultDraw'), color: 'dark:text-slate-400 text-slate-600' };
  if (entry.winnerId === uid) return { text: t('profile.resultWin'), color: 'text-yellow-400' };
  return { text: t('profile.resultLose'), color: 'text-red-400' };
}

/** 棋譜列表（複用於「我的棋譜」和「我的最愛」分頁，IMPROVEMENTS #22） */
function HistoryList({
  entries,
  currentUid,
  navigate,
  t,
}: {
  entries: GameHistoryEntry[];
  currentUid: string;
  navigate: (path: string) => void;
  t: TFunction;
}) {
  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const r = describeResult(e, currentUid, t);
        // 找對手（排除自己）
        const otherUids = e.playerUids.filter((u) => u !== currentUid);
        const opponentName = otherUids.length > 0
          ? otherUids.map((u) => e.playerNames[u] ?? '?').join('、')
          : t('profile.youWatched');
        const Icon = GAME_ICONS[e.gameType as GameType];
        return (
          <li
            key={e.id}
            data-testid="history-row"
            onClick={() => navigate(`/history/${e.id}`)}
            className="flex cursor-pointer items-center gap-3 rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-3 transition hover:dark:border-slate-500 hover:border-app-border-strong"
          >
            {Icon && <Icon className="h-8 w-8 dark:text-slate-200 text-slate-800" />}
            <span className={`w-12 text-center text-sm font-bold ${r.color}`}>
              {r.text}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {t(GAME_LABELS[e.gameType as GameType] ?? 'common.unknown')} · {opponentName}
              </p>
              <p className="text-xs text-slate-500">
                {formatTime(e.endedAt)} · {t('profile.totalMoves', { count: e.totalMoves })}
                {e.truncated && <span className="ml-1 text-yellow-400">（{t('profile.truncated')}）</span>}
              </p>
            </div>
            {e.hasAI && (
              <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-xs text-purple-200">
                AI
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Profile() {
  const { user, profile, profileLoading, setProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { entries, loading: historyLoading } = useUserHistory(user?.uid ?? null, 50);
  const { favorites, loading: favoritesLoading } = useUserFavorites(user?.uid ?? null);
  const [historyTab, setHistoryTab] = useState<'saved' | 'favorites'>('saved');
  const { stats, loading: statsLoading } = useUserStats(user?.uid ?? null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.nickname) setDraft(profile.nickname);
  }, [profile?.nickname]);

  if (!user) return null;

  const showStats = stats ?? null;
  const overallStats = showStats?.overall ?? {
    wins: entries.filter((e) => e.winnerId === user.uid).length,
    losses: entries.filter((e) => !e.isDraw && e.winnerId !== user.uid).length,
    draws: entries.filter((e) => e.isDraw).length,
    totalGames: entries.length,
    elo: 0,
  };
  const overallWinRate = calculateWinRate(overallStats);

  const handleStartEdit = () => {
    setDraft(profile?.nickname ?? '');
    setEditError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditError(null);
  };

  const handleSaveNickname = async (e: FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const v = validateNickname(draft);
    if (!v.ok) {
      setEditError(v.error ?? '暱稱無效');
      return;
    }
    if (v.trimmed === profile?.nickname) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateNickname(user.uid, draft);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新暱稱失敗');
    } finally {
      setSaving(false);
    }
  };

  const photoURL = profile?.photoURL ?? user.photoURL;
  const nickname = profile?.nickname ?? '載入中...';
  const isDefault = profile ? isDefaultNicknameFormat(profile.nickname) : false;

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/lobby')}
            className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
          >
            {t('profile.backToLobby')}
          </button>
          <button
            onClick={() => signOut()}
            className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
          >
            {t('nav.signOut')}
          </button>
        </div>
      </header>

      <section className="mb-6 flex items-center gap-4 rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6">
        {photoURL && (
          <img
            src={photoURL}
            alt={nickname}
            className="h-20 w-20 rounded-full"
          />
        )}
        <div className="flex-1">
          {editing ? (
            <form onSubmit={handleSaveNickname} className="space-y-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={12}
                autoFocus
                disabled={saving}
                className="w-full rounded border dark:border-slate-600 border-app-border-strong dark:bg-slate-900 bg-slate-50 px-3 py-2 text-lg font-bold focus:border-blue-500 focus:outline-none"
              />
              {editError && (
                <p className="text-xs text-red-400">{editError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium dark:text-white text-slate-900 hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm dark:text-slate-200 text-slate-800 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{nickname}</h2>
                {isDefault && (
                  <span className="rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                    {t('common.default')}
                  </span>
                )}
                <button
                  onClick={handleStartEdit}
                  disabled={profileLoading}
                  className="rounded text-xs text-blue-400 hover:text-blue-300"
                >
                  {t('common.edit')}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {profile?.googleDisplayName
                  ? t('profile.googleAccount', { email: user.email ?? '' })
                  : user.email ?? ''}
              </p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{t('profile.totalWins')}</p>
          <p className="text-3xl font-bold text-yellow-400">
            {showStats ? overallStats.wins : '—'}
          </p>
        </div>
      </section>

      {isDefault && !editing && (
        <section className="mb-6 rounded-lg border border-blue-700 bg-blue-900/20 p-3 text-sm text-blue-200">
          {t('profile.defaultNicknameNotice')}
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold dark:text-slate-300 text-slate-700">{t('profile.overallStats')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{overallStats.wins}</p>
            <p className="text-xs text-slate-500">{t('profile.wins')}</p>
          </div>
          <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{overallStats.losses}</p>
            <p className="text-xs text-slate-500">{t('profile.losses')}</p>
          </div>
          <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4 text-center">
            <p className="text-2xl font-bold dark:text-slate-400 text-slate-600">{overallStats.draws}</p>
            <p className="text-xs text-slate-500">{t('profile.draws')}</p>
          </div>
          <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{overallWinRate}%</p>
            <p className="text-xs text-slate-500">{t('profile.winRate')}</p>
          </div>
          <div
            className="rounded-lg border border-purple-700 bg-purple-900/20 p-4 text-center sm:col-span-1 col-span-2"
            title={t('profile.eloTooltip')}
          >
            <p className="text-2xl font-bold text-purple-300">{overallStats.elo}</p>
            <p className="text-xs text-slate-500">{t('profile.eloRating')}</p>
          </div>
        </div>
      </section>

      {showStats && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold dark:text-slate-300 text-slate-700">{t('profile.perGameStats')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(GAME_LABELS) as GameType[]).map((gt) => {
              const gs = getGameStats(showStats, gt);
              const rate = calculateWinRate(gs);
              const Icon = GAME_ICONS[gt];
              return (
                <div
                  key={gt}
                  className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-5 w-5 dark:text-slate-300 text-slate-700" />}
                      <p className="text-sm font-medium dark:text-white text-slate-900">
                        {t(GAME_LABELS[gt])}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{gs.totalGames} {t('profile.games')}</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div>
                      <p className="text-base font-bold text-yellow-400">{gs.wins}</p>
                      <p className="text-xs text-slate-500">{t('profile.wins')}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-red-400">{gs.losses}</p>
                      <p className="text-xs text-slate-500">{t('profile.losses')}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold dark:text-slate-400 text-slate-600">{gs.draws}</p>
                      <p className="text-xs text-slate-500">{t('profile.draws')}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-blue-400">{rate}%</p>
                      <p className="text-xs text-slate-500">{t('profile.winRate')}</p>
                    </div>
                    <div
                      title={t('profile.eloGameTooltip')}
                      className="rounded bg-purple-900/30 py-0.5"
                    >
                      <p className="text-base font-bold text-purple-300">{gs.elo}</p>
                      <p className="text-xs text-slate-500">ELO</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {statsLoading && !showStats && (
        <p className="mb-4 text-sm dark:text-slate-400 text-slate-600">{t('profile.statsLoading')}</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('profile.history')}</h2>

        {/* 分頁切換（IMPROVEMENTS #22 Phase 3） */}
        <div className="mb-3 flex gap-2 border-b dark:border-slate-700 border-app-border">
          <button
            type="button"
            onClick={() => setHistoryTab('saved')}
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              historyTab === 'saved'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 hover:text-slate-900'
            }`}
          >
            {t('profile.historyTabSaved')} ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setHistoryTab('favorites')}
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              historyTab === 'favorites'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 hover:text-slate-900'
            }`}
          >
            {t('profile.historyTabFavorites')} ({favorites.length})
          </button>
        </div>

        {historyTab === 'saved' ? (
          historyLoading ? (
            <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed dark:border-slate-700 border-app-border p-8 text-center text-slate-500">
              {t('profile.historyEmpty')}
            </div>
          ) : (
            <HistoryList entries={entries} currentUid={user.uid} navigate={navigate} t={t} />
          )
        ) : favoritesLoading ? (
          <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
        ) : favorites.length === 0 ? (
          <div className="rounded-lg border border-dashed dark:border-slate-700 border-app-border p-8 text-center text-slate-500">
            {t('profile.favoritesEmpty')}
          </div>
        ) : (
          <HistoryList entries={favorites} currentUid={user.uid} navigate={navigate} t={t} />
        )}
      </section>
    </div>
  );
}
