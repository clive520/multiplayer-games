import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../core/auth/useAuth';
import { signOut } from '../core/auth/googleSignIn';
import { useLeaderboard, type LeaderboardScope } from '../core/hooks/useLeaderboard';
import { getGameStats } from '../core/services/statsService';
import type { LeaderboardEntry } from '../core/services/statsService';
import { gameRegistry } from '@/registry';

type IconComponent = ComponentType<{ className?: string }>;

const SCOPE_I18N_KEY: Record<LeaderboardScope, string> = {
  overall: 'leaderboard.scopeOverall',
  tictactoe: 'leaderboard.scopeTictactoe',
  gomoku: 'leaderboard.scopeGomoku',
  reversi: 'leaderboard.scopeReversi',
  connect4: 'leaderboard.scopeConnect4',
};

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scope, setScope] = useState<LeaderboardScope>('overall');
  const { entries, loading, error } = useLeaderboard(scope);

  const gameLabel = t(SCOPE_I18N_KEY[scope]);
  // IMPROVEMENTS 自動從 registry 產生 tabs（新增遊戲自動顯示）
  const tabs: Array<{ value: LeaderboardScope; icon?: IconComponent }> = [
    { value: 'overall' },
    ...gameRegistry.map((g) => ({
      value: g.id as LeaderboardScope,
      icon: g.icon,
    })),
  ];

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('leaderboard.title')}</h1>
          <p className="text-sm dark:text-slate-400 text-slate-600">ELO 評分排序 · 前 20 名</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
            >
              {t('nav.profile')}
            </button>
          )}
          <button
            onClick={() => navigate('/lobby')}
            className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
          >
            {t('nav.lobby')}
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
            title={t('explore.title')}
          >
            🎬 {t('explore.title')}
          </button>
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1.5 text-sm hover:dark:bg-slate-600 bg-app-border-strong"
            >
              {t('nav.signOut')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setScope(tab.value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                scope === tab.value
                  ? 'bg-blue-600 dark:text-white text-slate-900'
                  : 'dark:bg-slate-700 bg-app-hover dark:text-slate-300 text-slate-700 hover:dark:bg-slate-600 bg-app-border-strong'
              }`}
            >
              {Icon && <Icon className="h-5 w-5" />}
              {t(SCOPE_I18N_KEY[tab.value])}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {t('lobby.loadRoomsFailed', { message: error.message })}
        </div>
      )}

      {loading ? (
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed dark:border-slate-700 border-app-border p-8 text-center text-slate-500">
          {t('leaderboard.empty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border dark:border-slate-700 border-app-border">
          <div className="border-b dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card px-4 py-2 text-xs dark:text-slate-400 text-slate-600">
            {t('common.loading')}：{gameLabel}（{entries.length}）
          </div>
          <table className="w-full">
            <thead className="dark:bg-slate-800 bg-app-card text-xs dark:text-slate-400 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">{t('leaderboard.player')}</th>
                <th className="px-3 py-2 text-right">{t('leaderboard.elo')}</th>
                <th className="px-3 py-2 text-right">{t('leaderboard.wins')}</th>
                <th className="px-3 py-2 text-right">{t('leaderboard.losses')}</th>
                <th className="px-3 py-2 text-right">{t('leaderboard.draws')}</th>
                <th className="px-3 py-2 text-right">{t('leaderboard.winRate')}</th>
                <th className="px-3 py-2 text-right">{t('profile.games')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: LeaderboardEntry, idx) => {
                const stats = getGameStats(entry, scope);
                const isMe = entry.uid === user?.uid;
                return (
                  <tr
                    key={entry.uid}
                    className={`border-t dark:border-slate-700 border-app-border ${
                      isMe ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-sm dark:text-slate-400 text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {entry.photoURL ? (
                          <img
                            src={entry.photoURL}
                            alt={entry.displayName}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full dark:bg-slate-700 bg-app-hover" />
                        )}
                        <span className="text-sm font-medium dark:text-white text-slate-900">
                          {entry.displayName}
                          {isMe && (
                            <span className="ml-1 text-xs dark:text-slate-400 text-slate-600">{t('common.you')}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-purple-400">
                      {stats.elo}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-yellow-400">
                      {stats.wins}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-red-400">
                      {stats.losses}
                    </td>
                    <td className="px-3 py-2 text-right text-sm dark:text-slate-400 text-slate-600">
                      {stats.draws}
                    </td>
                    <td className="px-3 py-2 text-right text-sm dark:text-slate-300 text-slate-700">
                      {entry.winRate}%
                    </td>
                    <td className="px-3 py-2 text-right text-sm dark:text-slate-400 text-slate-600">
                      {stats.totalGames}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
