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
import { TURN_TIME_LIMITS, type GameType, type RoomSummary, type TurnTimeLimit } from '../core/types/room';
import { RoomPreviewCard } from '../core/components/RoomPreviewCard';
import { rtdb } from '../core/firebase/rtdb';
import { ref, onValue, off } from 'firebase/database';
import {
  AI_DIFFICULTIES,
  AI_DIFFICULTY_DESCRIPTION,
  AI_DIFFICULTY_LABEL,
  type AIDifficulty,
} from '../core/types/ai';

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
  const [turnTimeLimitSec, setTurnTimeLimitSec] = useState<TurnTimeLimit>(30);
  // IMPROVEMENTS #9：對戰電腦模式
  const [createMode, setCreateMode] = useState<'pvp' | 'ai'>('pvp');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('normal');

  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingJoin, setPendingJoin] = useState<PendingJoin | null>(null);
  const [enterPassword, setEnterPassword] = useState('');

  const [cleanupInfo, setCleanupInfo] = useState<string | null>(null);

  // IMPROVEMENTS #7：房間 hover 預覽
  const [previewedRoomId, setPreviewedRoomId] = useState<string | null>(null);
  const [previewedGameState, setPreviewedGameState] = useState<{
    board?: ReadonlyArray<string>;
  } | null>(null);

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

  // IMPROVEMENTS #7：訂閱當前 hover 房間的 game state（單一連線，避免 N 個房間 N 個訂閱）
  useEffect(() => {
    if (!previewedRoomId) {
      setPreviewedGameState(null);
      return;
    }
    const stateRef = ref(rtdb, `rooms-live/${previewedRoomId}/state`);
    const handler = onValue(stateRef, (snap) => {
      const v = snap.val() as { board?: ReadonlyArray<string> } | null;
      setPreviewedGameState(v);
    });
    return () => {
      off(stateRef, 'value', handler);
    };
  }, [previewedRoomId]);

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
      const roomId = await createRoom(
        selectedGame,
        createMode === 'ai'
          ? { nickname, aiDifficulty }
          : { password, nickname, turnTimeLimitSec }
      );
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
          <p className="mb-2 text-sm text-slate-400">
            選擇遊戲
            {createMode === 'ai' && (
              <span className="ml-2 text-xs text-slate-500">
                （僅顯示有 AI 對手的遊戲）
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {gameRegistry
              .filter((g) => (createMode === 'ai' ? !!g.aiEngine : true))
              .map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGame(g.id as GameType)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      selectedGame === g.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        selectedGame === g.id ? 'text-white' : 'text-slate-300'
                      }`}
                    />
                    {g.name}
                    <span className="text-xs opacity-70">
                      ({g.minPlayers}-{g.maxPlayers} 人)
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">
                建立新房間
              </p>
              <div className="flex rounded-md border border-slate-600 p-0.5">
                <button
                  type="button"
                  onClick={() => setCreateMode('pvp')}
                  className={`rounded px-2 py-1 text-xs font-medium transition ${
                    createMode === 'pvp'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  對戰玩家
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('ai')}
                  className={`rounded px-2 py-1 text-xs font-medium transition ${
                    createMode === 'ai'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  對戰電腦
                </button>
              </div>
            </div>

            {createMode === 'pvp' && (
              <>
                <div className="mb-2">
                  <p className="mb-1 text-xs text-slate-400">每回合思考時間</p>
                  <div className="flex flex-wrap gap-1">
                    {TURN_TIME_LIMITS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setTurnTimeLimitSec(sec)}
                        className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
                          turnTimeLimitSec === sec
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {sec} 秒
                      </button>
                    ))}
                  </div>
                </div>
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
              </>
            )}

            {createMode === 'ai' && (
              <div className="mb-3">
                <p className="mb-1 text-xs text-slate-400">AI 難度</p>
                <div className="flex flex-wrap gap-1">
                  {AI_DIFFICULTIES.map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setAIDifficulty(diff)}
                      className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
                        aiDifficulty === diff
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {AI_DIFFICULTY_LABEL[diff]}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {AI_DIFFICULTY_DESCRIPTION[aiDifficulty]}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  💡 與電腦對戰，AI 會自動加入並開始對局
                </p>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={creating || !nickname}
              className={`w-full rounded-lg px-4 py-3 font-medium text-white disabled:opacity-50 ${
                createMode === 'ai'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {creating
                ? '建立中...'
                : !nickname
                  ? '暱稱載入中...'
                  : createMode === 'ai'
                    ? '🤖 對戰電腦'
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
            {rooms.map((room) => {
              const gameDef = gameRegistry.find((g) => g.id === room.gameType);
              const Icon = gameDef?.icon;
              const isPlaying = room.status === 'playing';
              const isPreviewed = previewedRoomId === room.id;
              return (
                <li key={room.id} className="group relative">
                  <button
                    onClick={() => handleEnterRoom(room)}
                    onMouseEnter={() => setPreviewedRoomId(room.id)}
                    onMouseLeave={() =>
                      setPreviewedRoomId((id) => (id === room.id ? null : id))
                    }
                    onFocus={() => setPreviewedRoomId(room.id)}
                    onBlur={() =>
                      setPreviewedRoomId((id) => (id === room.id ? null : id))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-4 text-left hover:border-slate-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {Icon && (
                          <Icon className="h-8 w-8 text-slate-300" />
                        )}
                        <div>
                          <p className="font-medium">
                            {GAME_LABELS[room.gameType] ?? room.gameType}
                            {room.hasPassword && (
                              <span
                                className="ml-2 text-xs text-yellow-400"
                                title="需要密碼"
                                aria-label="需要密碼"
                              >
                                [鎖]
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-400">
                            房主：{room.hostName} · {room.playerCount}/
                            {room.maxPlayers} 人
                            <span className="ml-2 text-yellow-300">
                              · 每回合 {room.turnTimeLimitSec} 秒
                            </span>
                            {gameDef?.estimatedDurationMin !== undefined && (
                              <span className="ml-2 text-slate-300">
                                · 預計 {gameDef.estimatedDurationMin} 分鐘
                              </span>
                            )}
                            {room.spectatorCount > 0 && (
                              <span className="ml-2 text-blue-300">
                                · {room.spectatorCount} 觀戰
                              </span>
                            )}
                          </p>
                          {gameDef?.description && (
                            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                              {gameDef.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            isPlaying
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-yellow-900/50 text-yellow-300'
                          }`}
                        >
                          {isPlaying ? '進行中' : '等待中'}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            isPlaying
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isPlaying ? '觀戰' : '加入'}
                        </span>
                      </div>
                    </div>
                  </button>
                  {/* IMPROVEMENTS #7：hover / focus 時顯示的預覽卡片 */}
                  <div
                    aria-hidden={!isPreviewed}
                    className={`pointer-events-none absolute left-0 right-0 top-full z-20 mt-2 transition-opacity duration-150 ${
                      isPreviewed ? 'opacity-100' : 'invisible opacity-0'
                    }`}
                  >
                    <RoomPreviewCard
                      room={room}
                      gameDef={gameDef}
                      gameState={isPreviewed ? previewedGameState : null}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
