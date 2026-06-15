import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import { useRoom } from '../core/hooks/useRoom';
import { usePresence } from '../core/hooks/usePresence';
import {
  leaveRoom,
  setPlayerReady,
  startGame,
  resetRoom,
  finishGame,
} from '../core/services/roomService';
import { resetGameState as resetTictactoeState, submitMove as submitTictactoeMove } from '@/games/tictactoe/sync';
import { resetGameState as resetGomokuState, submitMove as submitGomokuMove } from '@/games/gomoku/sync';
import { resetGameState as resetReversiState, submitMove as submitReversiMove } from '@/games/reversi/sync';
import { ResultScreen } from '../core/components/ResultScreen';
import { MoveHistory } from '../core/components/MoveHistory';
import { getGameDefinition } from '@/registry';
import type { GameComponentProps, MoveRecord } from '../core/types/game';
import { rtdb } from '../core/firebase/rtdb';
import { ref, onValue, off } from 'firebase/database';
import { useEffect, useState, useCallback, type ComponentType } from 'react';
import { isAIPlayerUid, parseAIPlayerUid, pickAIThinkDelayMs } from '../core/types/ai';

const TURN_TIME_LIMIT_SEC_FALLBACK = 30;

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { room, loading, error: roomError } = useRoom(roomId ?? null);
  // 動態載入遊戲元件：進入房間且 status=playing 時才 fetch 對應 chunk
  const [GameComp, setGameComp] = useState<ComponentType<GameComponentProps> | null>(null);
  const [gameCompLoading, setGameCompLoading] = useState(false);
  // 提早計算 gameDef，給後面的 useEffect 依賴用
  const gameDef = room ? getGameDefinition(room.gameType) : undefined;
  const presence = usePresence(roomId ?? null);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 棋譜歷史（IMPROVEMENTS #6）：訂閱 RTDB 的 moves 陣列
  const [moves, setMoves] = useState<ReadonlyArray<MoveRecord>>([]);
  // IMPROVEMENTS #9：訂閱 RTDB 完整 state，給 AI 自動下棋用
  const [rtGameState, setRtGameState] = useState<unknown>(null);
  useEffect(() => {
    if (!roomId) {
      setMoves([]);
      setRtGameState(null);
      return;
    }
    const movesRef = ref(rtdb, `rooms-live/${roomId}/state/moves`);
    const movesHandler = onValue(movesRef, (snap) => {
      setMoves((snap.val() as MoveRecord[] | null) ?? []);
    });
    const stateRef = ref(rtdb, `rooms-live/${roomId}/state`);
    const stateHandler = onValue(stateRef, (snap) => {
      setRtGameState(snap.val());
    });
    return () => {
      off(movesRef, 'value', movesHandler);
      off(stateRef, 'value', stateHandler);
    };
  }, [roomId]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // 自動 forfeit（回合倒數）相關
  const [forfeitTriggered, setForfeitTriggered] = useState(false);
  // 每秒 tick 用於重算剩餘秒數
  const [now, setNow] = useState(() => Date.now());

  // 提早計算 currentPlayer / isSpectator，給後面的 useEffect 依賴用
  const currentPlayer = room?.players.find((p) => p.uid === user?.uid) ?? null;
  const isSpectator = !!user && !currentPlayer;

  const resetGameStateFor = async (gameType: string, id: string): Promise<void> => {
    if (gameType === 'tictactoe') return resetTictactoeState(id);
    if (gameType === 'gomoku') return resetGomokuState(id);
    if (gameType === 'reversi') return resetReversiState(id);
  };

  const handleCopyCode = async () => {
    if (!room?.code) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('複製失敗，請手動選取');
    }
  };

  useEffect(() => {
    if (!roomId || !user) return;
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(`/api/rooms/${roomId}/leave`);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user]);

  // 遊戲進行中：每秒更新 now，驅動回合倒數重算
  useEffect(() => {
    if (room?.status !== 'playing') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room?.status]);

  // 遊戲狀態改變（重置 / 結束）時清空 forfeit 旗標
  useEffect(() => {
    if (room?.status !== 'playing') {
      setForfeitTriggered(false);
    }
  }, [room?.status]);

  // 動態載入遊戲 React 元件 chunk
  // 房間 status 變成 playing 或 gameType 改變時，重新 fetch 對應的遊戲程式碼
  useEffect(() => {
    if (!gameDef) {
      setGameComp(null);
      return;
    }
    let cancelled = false;
    setGameCompLoading(true);
    gameDef
      .loadComponent()
      .then((Comp) => {
        if (!cancelled) {
          setGameComp(() => Comp);
          setGameCompLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('載入遊戲元件失敗', err);
          setGameCompLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gameDef]);

  // 遊戲內有活動（下棋）時清空 forfeit 旗標（讓下一場不會立刻被誤判）
  const handleGameActivity = useCallback(() => {
    setForfeitTriggered(false);
    setNow(Date.now());
  }, []);

  // 自動 forfeit：當前玩家在 TURN_TIME_LIMIT_SEC 內未下棋時，自動判當前玩家落敗
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    if (forfeitTriggered) return;
    if (isSpectator) return;
    if (!room.turnStartedAt || !room.turnSymbol) return;

    const currentPlayer = room.players.find((p) => p.symbol === room.turnSymbol);
    if (!currentPlayer) return;

    const elapsedSec = Math.floor((now - room.turnStartedAt) / 1000);
    if (elapsedSec >= (room.turnTimeLimitSec ?? TURN_TIME_LIMIT_SEC_FALLBACK)) {
      // 自動判當前玩家落敗，另一位獲勝
      const winner = room.players.find((p) => p.uid !== currentPlayer.uid);
      if (!winner) return;
      setForfeitTriggered(true);
      console.log(
        `[Forfeit] 當前玩家 ${currentPlayer.displayName}（${room.turnSymbol}）回合逾時 ${room.turnTimeLimitSec} 秒，勝者：${winner.displayName}`
      );
      finishGame(roomId!, winner.uid, false).catch((err) => {
        console.error('自動判斷回合逾時失敗', err);
        setForfeitTriggered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, room?.turnStartedAt, room?.turnSymbol, room?.turnTimeLimitSec, room?.status, forfeitTriggered, isSpectator]);

  // IMPROVEMENTS #9：AI 自動下棋
  // 條件：房間進行中 + 當前玩家是 AI + AI 符號 = state 的 nextSymbol/currentTurn
  // 延遲 500-1500ms 隨機，避免像外掛
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    if (!rtGameState || !gameDef?.aiEngine) return;

    const aiPlayer = room.players.find((p) => isAIPlayerUid(p.uid));
    if (!aiPlayer) return;

    // 不同遊戲用不同欄位表示「輪到誰」：tictactoe/gomoku 用 nextSymbol、reversi 用 currentTurn
    const stateObj = rtGameState as Record<string, unknown>;
    const turnSymbol = (stateObj.nextSymbol ?? stateObj.currentTurn) as string | null;
    if (turnSymbol !== aiPlayer.symbol) return;

    const aiMeta = parseAIPlayerUid(aiPlayer.uid);
    if (!aiMeta) return;

    const timer = setTimeout(() => {
      // 雙重檢查：執行前再確認一次（避免 useEffect 競爭條件下重複觸發）
      const currentRoom = room; // closure
      if (currentRoom.status !== 'playing') return;
      const move = gameDef.aiEngine!.selectMove(rtGameState, aiPlayer.symbol as 'X' | 'O', aiMeta.difficulty);
      if (!move) return;
      const promise =
        currentRoom.gameType === 'tictactoe'
          ? submitTictactoeMove(roomId!, aiPlayer.uid, aiPlayer.symbol, aiPlayer.displayName, move as { row: number; col: number })
          : currentRoom.gameType === 'gomoku'
            ? submitGomokuMove(roomId!, aiPlayer.uid, aiPlayer.symbol, aiPlayer.displayName, move as { row: number; col: number })
            : currentRoom.gameType === 'reversi'
              ? submitReversiMove(roomId!, aiPlayer.uid, aiPlayer.symbol, aiPlayer.displayName, move as { row: number; col: number; pass?: boolean })
              : Promise.resolve({ applied: false, reason: '未知遊戲' });
      promise.catch((err) => {
        console.error('[AI] submitMove 失敗', err);
      });
    }, pickAIThinkDelayMs());

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtGameState, room?.status, room?.gameType, room?.players, gameDef, roomId]);

  // 計算目前這回合剩餘秒數（給 UI 顯示）
  const turnTimeLimitSec = room?.turnTimeLimitSec ?? TURN_TIME_LIMIT_SEC_FALLBACK;
  const turnSecondsLeft =
    room?.status === 'playing' && room.turnStartedAt && room.turnSymbol
      ? Math.max(0, turnTimeLimitSec - Math.floor((now - room.turnStartedAt) / 1000))
      : null;

  if (!roomId) return <Navigate to="/lobby" replace />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">載入房間中...</p>
      </div>
    );
  }
  if (roomError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">
          載入房間失敗：{roomError.message}
          <br />
          <span className="text-xs text-red-400">
            請確認 Firebase Console 中的 Firestore 規則是否允許讀取
          </span>
        </div>
        <button
          onClick={() => navigate('/lobby')}
          className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
        >
          回到大廳
        </button>
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
    // 觀戰者：直接離開，沒 forfeit 風險
    if (isSpectator) {
      await runAction(async () => {
        await leaveRoom(roomId);
        navigate('/lobby');
      });
      return;
    }
    // 玩家遊戲進行中：跳出確認對話框
    if (room?.status === 'playing' && !forfeitTriggered) {
      setShowLeaveConfirm(true);
      return;
    }
    // 非進行中 / 已 forfeit：直接離開
    await runAction(async () => {
      await leaveRoom(roomId);
      navigate('/lobby');
    });
  };

  const confirmLeave = async () => {
    setShowLeaveConfirm(false);
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
      await resetGameStateFor(room.gameType, roomId);
    });
  };

  const handleReset = async () => {
    await runAction(async () => {
      await resetRoom(roomId);
      await resetGameStateFor(room.gameType, roomId);
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {gameDef?.icon && (
            <gameDef.icon className="h-10 w-10 text-slate-200" />
          )}
          <div>
            <h1 className="text-xl font-bold">{gameDef?.name ?? room.gameType}</h1>
            <p className="text-sm text-slate-400">
              狀態：
              {room.status === 'waiting' ? '等待中' : isPlaying ? '進行中' : '已結束'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLeave}
          disabled={actionPending}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 disabled:opacity-50"
        >
          離開房間
        </button>
      </header>

      {room.status === 'waiting' && (
        <section className="mb-6 rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
          <p className="mb-1 text-xs text-yellow-300">邀請朋友加入此房間</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-widest text-yellow-400">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="rounded bg-yellow-700 px-3 py-1 text-sm text-white hover:bg-yellow-600"
            >
              {copied ? '已複製' : '複製房號'}
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 離開房間確認對話框（遊戲進行中） */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-red-700 bg-slate-800 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-red-300">確定要離開房間？</h3>
            <p className="mb-2 text-sm leading-relaxed text-slate-300">
              遊戲正在進行中，主動離開將直接判定你方
              <span className="mx-1 font-bold text-red-400">落敗</span>
              ，對方獲勝。
            </p>
            <p className="mb-6 text-xs text-slate-500">
              如果只是暫時離開，建議等對方回合逾時自動判定，或繼續完成這一局。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={confirmLeave}
                disabled={actionPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {actionPending ? '離開中...' : '確認離開（落敗）'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSpectator && (
        <section className="mb-4 rounded-lg border border-blue-700 bg-blue-900/20 p-3 text-sm text-blue-200">
          您正在觀戰這場比賽，無法進行任何操作。
        </section>
      )}

      <section className="mb-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          玩家（{room.players.length}/{gameDef?.maxPlayers ?? 2}）
        </h2>
        <ul className="space-y-2">
          {room.players.length === 0 ? (
            <li className="text-slate-500">房間沒有玩家</li>
          ) : (
            room.players.map((p) => {
              const isOnline = presence[p.uid]?.online === true;
              const symbolLabel = gameDef?.formatSymbol
                ? gameDef.formatSymbol(p.symbol)
                : p.symbol;
              const symbolBadgeClass =
                room.gameType === 'tictactoe'
                  ? p.symbol === 'X'
                    ? 'bg-blue-900/60 text-blue-200'
                    : 'bg-red-900/60 text-red-200'
                  : p.symbol === 'X'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'bg-zinc-100 text-zinc-900';
              return (
                <li
                  key={p.uid}
                  className="flex items-center gap-3 rounded bg-slate-900/50 p-2"
                >
                  <div className="relative">
                    {p.photoURL ? (
                      <img
                        src={p.photoURL}
                        alt={p.displayName}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-700" />
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-green-500' : 'bg-slate-500'
                      }`}
                      title={isOnline ? '在線' : '離線'}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {p.displayName}
                      {p.isHost && (
                        <span className="rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                          房主
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${symbolBadgeClass}`}
                        title={room.gameType === 'tictactoe' ? '棋子符號' : '隊伍'}
                      >
                        {symbolLabel}
                      </span>
                    </p>
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
              );
            })
          )}
        </ul>
      </section>

      {room.spectators.length > 0 && (
        <section className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            觀戰者（{room.spectators.length}）
          </h2>
          <ul className="space-y-2">
            {room.spectators.map((s) => {
              const isOnline = presence[s.uid]?.online === true;
              return (
                <li
                  key={s.uid}
                  className="flex items-center gap-3 rounded bg-slate-900/50 p-2"
                >
                  <div className="relative">
                    {s.photoURL ? (
                      <img
                        src={s.photoURL}
                        alt={s.nickname}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-700" />
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-green-500' : 'bg-slate-500'
                      }`}
                      title={isOnline ? '在線' : '離線'}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.nickname}</p>
                    <p className="text-xs text-slate-500">觀戰中</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      {isPlaying && gameDef && (currentPlayer || isSpectator) && GameComp && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GameComp
              roomId={roomId}
              currentUserId={user!.uid}
              players={room.players.map((p) => ({
                uid: p.uid,
                symbol: p.symbol,
                displayName: p.displayName,
                photoURL: p.photoURL,
              }))}
              isHost={isHost}
              isSpectator={isSpectator}
              turnSecondsLeft={turnSecondsLeft}
              turnTimeLimitSec={turnTimeLimitSec}
              turnSymbol={room.turnSymbol}
              formatSymbol={gameDef.formatSymbol}
              onGameFinished={async (winnerId, isDraw) => {
                await finishGame(roomId, winnerId, isDraw);
              }}
              onActivity={handleGameActivity}
            />
          </div>
          <aside className="lg:col-span-1">
            <MoveHistory
              moves={moves}
              currentUserId={user!.uid}
              formatSymbol={gameDef.formatSymbol}
            />
          </aside>
        </div>
      )}

      {isPlaying && gameDef && (currentPlayer || isSpectator) && !GameComp && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
          <p className="text-slate-400">
            {gameCompLoading ? '載入遊戲中...' : '遊戲元件準備中...'}
          </p>
        </div>
      )}

      {isFinished && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ResultScreen
              room={room}
              currentUserId={user!.uid}
              currentUserDisplayName={profile?.nickname ?? currentPlayer?.displayName ?? '匿名'}
              isHost={isHost}
              leaving={actionPending}
              onLeave={handleLeave}
              onPlayAgain={handleReset}
              isSpectator={isSpectator}
            />
          </div>
          <aside className="lg:col-span-1">
            <MoveHistory
              moves={moves}
              currentUserId={user!.uid}
              formatSymbol={gameDef?.formatSymbol}
            />
            {isSpectator && (
              <p className="mt-2 text-xs text-slate-400">
                完整棋譜請看上方。觀戰者可自由留下觀看結果，按「返回大廳」手動離開。
              </p>
            )}
          </aside>
        </div>
      )}

    </div>
  );
}
