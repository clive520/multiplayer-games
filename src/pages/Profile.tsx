import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { useUserHistory } from '../core/hooks/useUserHistory';
import { useUserStats } from '../core/hooks/useUserStats';
import { signOut } from '../core/auth/googleSignIn';
import { calculateWinRate, getGameStats } from '../core/services/statsService';
import { updateNickname, validateNickname } from '../core/services/profileService';
import { isDefaultNicknameFormat } from '../core/types/user';
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
  const { user, profile, profileLoading, setProfile } = useAuth();
  const navigate = useNavigate();
  const { entries, loading: historyLoading } = useUserHistory(user?.uid ?? null, 50);
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
        <h1 className="text-2xl font-bold">我的檔案</h1>
        <div className="flex gap-2">
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
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-lg font-bold focus:border-blue-500 focus:outline-none"
              />
              {editError && (
                <p className="text-xs text-red-400">{editError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="rounded bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{nickname}</h2>
                {isDefault && (
                  <span className="rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                    預設
                  </span>
                )}
                <button
                  onClick={handleStartEdit}
                  disabled={profileLoading}
                  className="rounded text-xs text-blue-400 hover:text-blue-300"
                >
                  編輯
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {profile?.googleDisplayName
                  ? `Google 帳號：${user.email}`
                  : user.email ?? ''}
              </p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">總勝場</p>
          <p className="text-3xl font-bold text-yellow-400">
            {showStats ? overallStats.wins : '—'}
          </p>
        </div>
      </section>

      {isDefault && !editing && (
        <section className="mb-6 rounded-lg border border-blue-700 bg-blue-900/20 p-3 text-sm text-blue-200">
          目前使用預設暱稱（流水號），點上方「編輯」改成你喜歡的名稱。
        </section>
      )}

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
