import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { useRoom } from '../core/hooks/useRoom';
import {
  leaveRoom,
  setPlayerReady,
  startGame,
  resetRoom,
} from '../core/services/roomService';
import { getGameDefinition } from '@/registry';
import { useEffect, useState } from 'react';

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, loading } = useRoom(roomId ?? null);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(`/api/rooms/${roomId}/leave`);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user]);

  if (!roomId) return <Navigate to="/lobby" replace />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">載入房間中...</p>
      </div>
    );
  }
  if (!room) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-300">找不到此房間</p>
        <button
          onClick={() => navigate('/lobby')}
          className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
        >
          回到大廳
        </button>
      </div>
    );
  }

  const currentPlayer = room.players.find((p) => p.uid === user?.uid) ?? null;
  const gameDef = getGameDefinition(room.gameType);
  const isHost = currentPlayer?.isHost ?? false;
  const isFinished = room.status === 'finished';
  const isPlaying = room.status === 'playing';

  const runAction = async (fn: () => Promise<void>) => {
    setError(null);
    setActionPending(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionPending(false);
    }
  };

  const handleLeave = async () => {
    await runAction(async () => {
      await leaveRoom(roomId);
      navigate('/lobby');
    });
  };

  const handleToggleReady = async () => {
    if (!currentPlayer) return;
    await runAction(async () => {
      await setPlayerReady(roomId, !currentPlayer.ready);
    });
  };

  const handleStart = async () => {
    await runAction(async () => {
      await startGame(roomId);
    });
  };

  const handleReset = async () => {
    await runAction(async () => {
      await resetRoom(roomId);
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{gameDef?.name ?? room.gameType}</h1>
          <p className="text-sm text-slate-400">
            狀態：
            {room.status === 'waiting' ? '等待中' : isPlaying ? '進行中' : '已結束'}
          </p>
        </div>
        <button
          onClick={handleLeave}
          disabled={actionPending}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 disabled:opacity-50"
        >
          離開房間
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">玩家</h2>
        <ul className="space-y-2">
          {room.players.length === 0 ? (
            <li className="text-slate-500">房間沒有玩家</li>
          ) : (
            room.players.map((p) => (
              <li
                key={p.uid}
                className="flex items-center gap-3 rounded bg-slate-900/50 p-2"
              >
                {p.photoURL && (
                  <img
                    src={p.photoURL}
                    alt={p.displayName}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {p.displayName}
                    {p.isHost && (
                      <span className="ml-2 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                        房主
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">符號：{p.symbol}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    p.ready
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {p.ready ? '準備' : '未準備'}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {room.status === 'waiting' && currentPlayer && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={handleToggleReady}
            disabled={actionPending}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {currentPlayer.ready ? '取消準備' : '準備'}
          </button>
          {isHost && (
            <button
              onClick={handleStart}
              disabled={
                actionPending ||
                room.players.length < 2 ||
                !room.players.every((p) => p.ready)
              }
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              開始遊戲
            </button>
          )}
        </div>
      )}

      {isPlaying && gameDef && (
        <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <p className="text-slate-300">遊戲進行中</p>
          <p className="mt-2 text-sm text-slate-500">
            （遊戲元件將在 Phase 3 整合）
          </p>
        </section>
      )}

      {isFinished && (
        <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold">遊戲結束</h2>
          {room.isDraw ? (
            <p className="text-slate-300">平手！</p>
          ) : (
            <p className="text-slate-300">
              獲勝者：
              {room.players.find((p) => p.uid === room.winnerId)?.displayName ?? '未知'}
            </p>
          )}
          {isHost && (
            <button
              onClick={handleReset}
              disabled={actionPending}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              再來一局
            </button>
          )}
        </section>
      )}
    </div>
  );
}
