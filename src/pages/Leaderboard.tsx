import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { signOut } from '../core/auth/googleSignIn';
import { useLeaderboard, type LeaderboardScope } from '../core/hooks/useLeaderboard';
import { getGameStats } from '../core/services/statsService';
import type { LeaderboardEntry } from '../core/services/statsService';
import { gameRegistry } from '@/registry';

type IconComponent = ComponentType<{ className?: string }>;
const TABS: Array<{ value: LeaderboardScope; label: string; Icon?: IconComponent }> = [
  { value: 'overall', label: '綜合' },
  {
    value: 'tictactoe',
    label: '井字遊戲',
    Icon: gameRegistry.find((g) => g.id === 'tictactoe')!.icon,
  },
  {
    value: 'gomoku',
    label: '五子棋',
    Icon: gameRegistry.find((g) => g.id === 'gomoku')!.icon,
  },
  {
    value: 'reversi',
    label: '黑白棋',
    Icon: gameRegistry.find((g) => g.id === 'reversi')!.icon,
  },
];

const SCOPE_LABEL: Record<LeaderboardScope, string> = {
  overall: '綜合',
  tictactoe: '井字遊戲',
  gomoku: '五子棋',
  reversi: '黑白棋',
};

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scope, setScope] = useState<LeaderboardScope>('overall');
  const { entries, loading, error } = useLeaderboard(scope);

  const gameLabel = SCOPE_LABEL[scope];

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">排行榜</h1>
          <p className="text-sm text-slate-400">
            依勝場數排序，前 20 名
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              我的檔案
            </button>
          )}
          <button
            onClick={() => navigate('/lobby')}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            遊戲大廳
          </button>
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              登出
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.Icon;
          return (
            <button
              key={t.value}
              onClick={() => setScope(t.value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                scope === t.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {Icon && <Icon className="h-5 w-5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          載入排行榜失敗：{error.message}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">載入中...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">
          目前還沒有任何「{gameLabel}」的對戰紀錄
          <br />
          <span className="text-xs text-slate-600">
            完成一場 {gameLabel} 對戰後就會出現在這裡
          </span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <div className="border-b border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-400">
            目前顯示：{gameLabel}（{entries.length} 筆）
          </div>
          <table className="w-full">
            <thead className="bg-slate-800 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">玩家</th>
                <th className="px-3 py-2 text-right">勝</th>
                <th className="px-3 py-2 text-right">敗</th>
                <th className="px-3 py-2 text-right">和</th>
                <th className="px-3 py-2 text-right">勝率</th>
                <th className="px-3 py-2 text-right">總場</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: LeaderboardEntry, idx) => {
                const stats = getGameStats(entry, scope);
                const isMe = entry.uid === user?.uid;
                return (
                  <tr
                    key={entry.uid}
                    className={`border-t border-slate-700 ${
                      isMe ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-sm text-slate-400">
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
                          <div className="h-6 w-6 rounded-full bg-slate-700" />
                        )}
                        <span className="text-sm font-medium text-white">
                          {entry.displayName}
                          {isMe && (
                            <span className="ml-1 text-xs text-slate-400">（你）</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-yellow-400">
                      {stats.wins}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-red-400">
                      {stats.losses}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-400">
                      {stats.draws}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-300">
                      {entry.winRate}%
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-400">
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
