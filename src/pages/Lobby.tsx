import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { signOut } from '../core/auth/googleSignIn';
import { useLobby } from '../core/hooks/useLobby';
import { createRoom, joinRoomByCode } from '../core/services/roomService';
import type { GameType, RoomSummary } from '../core/types/room';

const GAME_LABELS: Record<GameType, string> = {
  tictactoe: '井字遊戲',
};

export default function Lobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rooms, loading } = useLobby();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const roomId = await createRoom('tictactoe');
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立房間失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const roomId = await joinRoomByCode(joinCode);
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入房間失敗');
    } finally {
      setJoining(false);
    }
  };

  const handleEnterRoom = (room: RoomSummary) => {
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">遊戲大廳</h1>
          <p className="text-sm text-slate-400">
            歡迎，{user?.displayName ?? '訪客'}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
        >
          登出
        </button>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg bg-blue-600 px-6 py-4 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {creating ? '建立中...' : '建立新房間'}
        </button>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="輸入 6 碼房號"
            maxLength={6}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-center text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={joining || joinCode.length !== 6}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {joining ? '加入中...' : '加入'}
          </button>
        </form>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">開放中的房間</h2>

        {loading ? (
          <p className="text-slate-400">載入中...</p>
        ) : rooms.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500">
            目前沒有開放中的房間，點上方「建立新房間」開始
          </p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  onClick={() => handleEnterRoom(room)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-4 text-left hover:border-slate-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{GAME_LABELS[room.gameType] ?? room.gameType}</p>
                      <p className="text-sm text-slate-400">
                        房主：{room.hostName} · {room.playerCount}/{room.maxPlayers} 人
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        room.status === 'waiting'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-green-900/50 text-green-300'
                      }`}
                    >
                      {room.status === 'waiting' ? '等待中' : '進行中'}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
