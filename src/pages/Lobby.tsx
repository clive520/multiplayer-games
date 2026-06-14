import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { signOut } from '../core/auth/googleSignIn';
import { useLobby } from '../core/hooks/useLobby';
import {
  createRoom,
  joinRoomByCode,
  lookupRoomByCode,
  cleanupAbandonedRooms,
} from '../core/services/roomService';
import { gameRegistry } from '@/registry';
import type { GameType, RoomSummary } from '../core/types/room';

const GAME_LABELS: Record<string, string> = Object.fromEntries(
  gameRegistry.map((g) => [g.id, g.name])
);

interface PendingJoin {
  roomId: string;
  code: string;
  gameType: GameType;
}

export default function Lobby() {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const { rooms, loading, error: lobbyError } = useLobby();
  const nickname = profile?.nickname ?? null;

  const [selectedGame, setSelectedGame] = useState<GameType>('tictactoe');
  const [createPassword, setCreatePassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);

  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingJoin, setPendingJoin] = useState<PendingJoin | null>(null);
  const [enterPassword, setEnterPassword] = useState('');

  const [cleanupInfo, setCleanupInfo] = useState<string | null>(null);

  useEffect(() => {
    cleanupAbandonedRooms()
      .then((result) => {
        if (result.deletedCount > 0) {
          setCleanupInfo(
            `已自動清理 ${result.deletedCount} 個無人的房間`
          );
          setTimeout(() => setCleanupInfo(null), 5000);
        }
      })
      .catch((err) => {
        console.warn('清理廢棄房間失敗', err);
      });
  }, []);

  const handleCreate = async () => {
    setActionError(null);
    if (!nickname) {
      setActionError('暱稱尚未載入，請稍候');
      return;
    }

    let password: string | undefined;
    if (usePassword) {
      const trimmed = createPassword.trim();
      if (!/^\d{6}$/.test(trimmed)) {
        setActionError('密碼必須是 6 位數字');
        return;
      }
      password = trimmed;
    }

    setCreating(true);
    try {
      const roomId = await createRoom(selectedGame, { password, nickname });
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '建立房間失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!/^[A-Z2-9]{6}$/.test(joinCode)) {
      setActionError('房號格式錯誤');
      return;
    }
    if (!nickname) {
      setActionError('暱稱尚未載入，請稍候');
      return;
    }

    setJoining(true);
    try {
      const lookup = await lookupRoomByCode(joinCode);
      if (!lookup) {
        setActionError('找不到此房號的房間');
        return;
      }
      if (lookup.hasPassword) {
        setPendingJoin({
          roomId: lookup.roomId,
          code: joinCode,
          gameType: lookup.gameType,
        });
        setEnterPassword('');
        return;
      }
      const roomId = await joinRoomByCode(joinCode, { nickname });
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '加入房間失敗');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingJoin) return;
    setActionError(null);
    if (!/^\d{6}$/.test(enterPassword)) {
      setActionError('密碼必須是 6 位數字');
      return;
    }
    if (!nickname) {
      setActionError('暱稱尚未載入，請稍候');
      return;
    }
    setJoining(true);
    try {
      const roomId = await joinRoomByCode(pendingJoin.code, {
        password: enterPassword,
        nickname,
      });
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '加入房間失敗');
    } finally {
      setJoining(false);
    }
  };

  const handleCancelPassword = () => {
    setPendingJoin(null);
    setEnterPassword('');
    setActionError(null);
  };

  const handleEnterRoom = async (room: RoomSummary) => {
    if (!nickname) {
      setActionError('暱稱尚未載入，請稍候');
      return;
    }
    if (room.hasPassword) {
      setPendingJoin({
        roomId: room.id,
        code: room.code,
        gameType: room.gameType,
      });
      setEnterPassword('');
      setActionError(null);
      return;
    }
    setActionError(null);
    setJoining(true);
    try {
      const roomId = await joinRoomByCode(room.code, { nickname });
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '加入房間失敗');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">遊戲大廳</h1>
          <p className="text-sm text-slate-400">
            歡迎，{profileLoading ? '載入中...' : (nickname ?? '訪客')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            編輯暱稱
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            排行榜
          </button>
          <button
            onClick={() => signOut()}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
          >
            登出
          </button>
        </div>
      </header>

      {cleanupInfo && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-slate-800 p-3 text-sm text-slate-300">
          {cleanupInfo}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      <section className="mb-6 space-y-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="mb-2 text-sm text-slate-400">選擇遊戲</p>
          <div className="flex flex-wrap gap-2">
            {gameRegistry.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g.id as GameType)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedGame === g.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {g.name}
                <span className="ml-1 text-xs opacity-70">
                  ({g.minPlayers}-{g.maxPlayers} 人)
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <p className="mb-2 text-sm font-medium text-slate-300">
              建立新房間
            </p>
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={usePassword}
                onChange={(e) => {
                  setUsePassword(e.target.checked);
                  if (!e.target.checked) setCreatePassword('');
                }}
                className="h-4 w-4 rounded border-slate-600"
              />
              <span>設定 6 位數字密碼</span>
            </label>
            {usePassword && (
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                value={createPassword}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCreatePassword(v);
                }}
                placeholder="6 位數字"
                maxLength={6}
                className="mb-2 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-center text-lg tracking-widest"
              />
            )}
            <button
              onClick={handleCreate}
              disabled={creating || !nickname}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {creating
                ? '建立中...'
                : !nickname
                  ? '暱稱載入中...'
                  : `建立 ${usePassword ? '密碼' : ''}房間`}
            </button>
          </div>

          <form
            onSubmit={handleJoinSubmit}
            className="rounded-lg border border-slate-700 bg-slate-800 p-4"
          >
            <p className="mb-2 text-sm font-medium text-slate-300">
              用房號加入
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="輸入 6 碼房號"
              maxLength={6}
              className="mb-2 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-center text-lg tracking-widest uppercase"
            />
            <button
              type="submit"
              disabled={joining || joinCode.length !== 6 || !nickname}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {joining ? '加入中...' : !nickname ? '暱稱載入中...' : '加入'}
            </button>
          </form>
        </div>
      </section>

      {pendingJoin && (
        <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
          <p className="mb-2 text-sm text-yellow-300">
            房間 <span className="font-mono font-bold">{pendingJoin.code}</span>{' '}
            需要密碼
          </p>
          <form onSubmit={handleJoinWithPassword} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              value={enterPassword}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setEnterPassword(v);
              }}
              placeholder="輸入 6 位數字密碼"
              maxLength={6}
              autoFocus
              className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-2 text-center text-lg tracking-widest"
            />
            <button
              type="submit"
              disabled={joining || enterPassword.length !== 6}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {joining ? '驗證中...' : '確認'}
            </button>
            <button
              type="button"
              onClick={handleCancelPassword}
              className="rounded-lg bg-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-600"
            >
              取消
            </button>
          </form>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">開放中的房間</h2>

        {lobbyError ? (
          <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">
            載入房間列表失敗：{lobbyError.message}
            <br />
            <span className="text-xs text-red-400">
              請確認 Firebase Console 中的 Firestore 規則是否允許讀取
            </span>
          </div>
        ) : loading ? (
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
                    <div className="flex items-center gap-2">
                      {room.hasPassword && (
                        <span
                          className="text-yellow-400"
                          title="需要密碼"
                          aria-label="需要密碼"
                        >
                          [鎖]
                        </span>
                      )}
                      <div>
                        <p className="font-medium">
                          {GAME_LABELS[room.gameType] ?? room.gameType}
                        </p>
                        <p className="text-sm text-slate-400">
                          房主：{room.hostName} · {room.playerCount}/
                          {room.maxPlayers} 人
                        </p>
                      </div>
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
