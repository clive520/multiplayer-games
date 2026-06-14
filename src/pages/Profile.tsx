import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { useUserHistory } from '../core/hooks/useUserHistory';
import { useUserStats } from '../core/hooks/useUserStats';
import { signOut } from '../core/auth/googleSignIn';
import { calculateWinRate, getGameStats } from '../core/services/statsService';
import type { GameHistoryEntry } from '../core/services/historyService';
import type { GameType } from '../core/types/room';

const GAME_LABELS: Record<GameType, string> = {
  tictactoe: '井字遊戲',
  gomoku: '五子棋',
  reversi: '黑白棋',
};

const GAME_ICONS: Record<GameType, string> = {
  tictactoe: '[井]',
  gomoku: '[五]',
  reversi: '[黑]',
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

function describeResult(entry: GameHistoryEntry, uid: string): { text: string; color: string } {
  if (entry.isDraw) return { text: '平手', color: 'text-slate-400' };
  if (entry.winnerId === uid) return { text: '勝', color: 'text-yellow-400' };
  return { text: '敗', color: 'text-red-400' };
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { entries, loading: historyLoading } = useUserHistory(user?.uid ?? null, 50);
  const { stats, loading: statsLoading } = useUserStats(user?.uid ?? null);

  if (!user) return null;

  // 顯示的 stats：以 Firestore 的累計為主，否則 fallback 到最近 50 場計算
  const showStats = stats ?? null;
  const overallStats = showStats?.overall ?? {
    wins: entries.filter((e) => e.winnerId === user.uid).length,
    losses: entries.filter((e) => !e.isDraw && e.winnerId !== user.uid).length,
    draws: entries.filter((e) => e.isDraw).length,
    totalGames: entries.length,
  };
  const overallWinRate = calculateWinRate(overallStats);

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的檔案</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/leaderboard')}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            排行榜
          </button>
          <button
            onClick={() => navigate('/lobby')}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            遊戲大廳
          </button>
          <button
            onClick={() => signOut()}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            登出
          </button>
        </div>
      </header>

      <section className="mb-6 flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800 p-6">
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'avatar'}
            className="h-20 w-20 rounded-full"
          />
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold">{user.displayName}</h2>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">總勝場</p>
          <p className="text-3xl font-bold text-yellow-400">
            {showStats ? overallStats.wins : '—'}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">綜合戰績</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{overallStats.wins}</p>
            <p className="text-xs text-slate-500">勝場</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{overallStats.losses}</p>
            <p className="text-xs text-slate-500">敗場</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-slate-400">{overallStats.draws}</p>
            <p className="text-xs text-slate-500">和局</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{overallWinRate}%</p>
            <p className="text-xs text-slate-500">勝率</p>
          </div>
        </div>
      </section>

      {showStats && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">分遊戲戰績</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(GAME_LABELS) as GameType[]).map((gt) => {
              const gs = getGameStats(showStats, gt);
              const rate = calculateWinRate(gs);
              return (
                <div
                  key={gt}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      <span className="mr-1 text-slate-500">{GAME_ICONS[gt]}</span>
                      {GAME_LABELS[gt]}
                    </p>
                    <p className="text-xs text-slate-500">{gs.totalGames} 場</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <p className="text-base font-bold text-yellow-400">{gs.wins}</p>
                      <p className="text-xs text-slate-500">勝</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-red-400">{gs.losses}</p>
                      <p className="text-xs text-slate-500">敗</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-400">{gs.draws}</p>
                      <p className="text-xs text-slate-500">和</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-blue-400">{rate}%</p>
                      <p className="text-xs text-slate-500">勝率</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {statsLoading && !showStats && (
        <p className="mb-4 text-sm text-slate-400">載入 stats 中...</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">對戰紀錄</h2>
        {historyLoading ? (
          <p className="text-slate-400">載入中...</p>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">
            還沒有對戰紀錄
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const r = describeResult(e, user.uid);
              const opponent = e.players.find((p) => p.uid !== user.uid);
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3"
                >
                  <span
                    className={`w-8 text-center text-sm font-bold ${r.color}`}
                  >
                    {r.text}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">
                      vs {opponent?.displayName ?? '?'}（{opponent?.symbol ?? '?'}）
                    </p>
                    <p className="text-xs text-slate-500">{formatTime(e.endedAt)}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {GAME_LABELS[e.gameType as GameType] ?? e.gameType}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
