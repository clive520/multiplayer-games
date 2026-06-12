import { useLeaderboard } from '../core/hooks/useLeaderboard';
import { useAuth } from '../core/auth/useAuth';
import { signOut } from '../core/auth/googleSignIn';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
  const { user } = useAuth();
  const { entries, loading, error } = useLeaderboard();
  const navigate = useNavigate();

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

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          載入排行榜失敗：{error.message}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">載入中...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">
          目前還沒有任何對戰紀錄
          <br />
          <span className="text-xs text-slate-600">
            完成一場遊戲後就會出現在這裡
          </span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <table className="w-full">
            <thead className="bg-slate-800 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">玩家</th>
                <th className="px-3 py-2 text-right">勝</th>
                <th className="px-3 py-2 text-right">敗</th>
                <th className="px-3 py-2 text-right">和</th>
                <th className="px-3 py-2 text-right">勝率</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: import('../core/services/statsService').LeaderboardEntry, idx: number) => {
                const isMe = e.uid === user?.uid;
                return (
                  <tr
                    key={e.uid}
                    className={`border-t border-slate-700 ${
                      isMe ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-sm text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {e.photoURL ? (
                          <img
                            src={e.photoURL}
                            alt={e.displayName}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-700" />
                        )}
                        <span className="text-sm font-medium text-white">
                          {e.displayName}
                          {isMe && (
                            <span className="ml-1 text-xs text-slate-400">（你）</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-yellow-400">
                      {e.wins}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-red-400">
                      {e.losses}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-400">
                      {e.draws}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-300">
                      {e.winRate}%
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
