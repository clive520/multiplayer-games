import { useEffect, useState } from 'react';
import type { Room } from '../types/room';

interface ResultScreenProps {
  room: Room;
  currentUserId: string;
  isHost: boolean;
  leaving: boolean;
  onLeave: () => void;
  onPlayAgain: () => void;
  autoLeaveSeconds?: number;
}

type Outcome = 'win' | 'lose' | 'draw';

function getOutcome(room: Room, currentUserId: string): Outcome {
  if (room.isDraw) return 'draw';
  if (room.winnerId && room.winnerId === currentUserId) return 'win';
  return 'lose';
}

const OUTCOME_STYLE: Record<
  Outcome,
  { border: string; bg: string; title: string; subtitle: string; accent: string }
> = {
  win: {
    border: 'border-yellow-500',
    bg: 'bg-gradient-to-b from-yellow-900/30 to-slate-800',
    title: '你贏了！',
    subtitle: 'text-yellow-300',
    accent: 'text-yellow-400',
  },
  lose: {
    border: 'border-red-700',
    bg: 'bg-gradient-to-b from-red-900/20 to-slate-800',
    title: '你輸了',
    subtitle: 'text-red-300',
    accent: 'text-red-400',
  },
  draw: {
    border: 'border-slate-500',
    bg: 'bg-gradient-to-b from-slate-700/40 to-slate-800',
    title: '平手！',
    subtitle: 'text-slate-300',
    accent: 'text-slate-300',
  },
};

export function ResultScreen({
  room,
  currentUserId,
  isHost,
  leaving,
  onLeave,
  onPlayAgain,
  autoLeaveSeconds = 20,
}: ResultScreenProps) {
  const [countdown, setCountdown] = useState(autoLeaveSeconds);
  const [countdownActive, setCountdownActive] = useState(true);
  const [hasAutoLeft, setHasAutoLeft] = useState(false);

  useEffect(() => {
    if (!countdownActive) return;
    if (countdown <= 0) {
      if (!hasAutoLeft) {
        setHasAutoLeft(true);
        onLeave();
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, countdownActive, hasAutoLeft, onLeave]);

  const outcome = getOutcome(room, currentUserId);
  const style = OUTCOME_STYLE[outcome];
  const winner = room.players.find((p) => p.uid === room.winnerId) ?? null;
  const progressPct = Math.max(0, Math.min(100, (countdown / autoLeaveSeconds) * 100));

  return (
    <section
      data-testid="result-screen"
      data-outcome={outcome}
      className={`rounded-xl border-2 ${style.border} ${style.bg} p-8 shadow-xl`}
    >
      <div className="text-center">
        <p className={`text-xs font-semibold uppercase tracking-widest ${style.subtitle}`}>
          遊戲結束
        </p>
        <h2 className={`mt-2 text-4xl font-bold ${style.accent}`}>{style.title}</h2>

        {!room.isDraw && winner && (
          <p className="mt-3 text-slate-300">
            獲勝者：
            <span className="font-semibold text-white">{winner.displayName}</span>
            <span className="ml-2 text-slate-500">（{winner.symbol}）</span>
          </p>
        )}

        {room.isDraw && (
          <p className="mt-3 text-slate-400">雙方勢均力敵，棋逢敵手</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {room.players.map((p) => {
          const isMe = p.uid === currentUserId;
          const isWinner = p.uid === room.winnerId;
          return (
            <div
              key={p.uid}
              className={`rounded-lg border p-3 ${
                isWinner
                  ? 'border-yellow-500 bg-yellow-900/20'
                  : outcome === 'lose' && isMe
                    ? 'border-red-700 bg-red-900/20'
                    : 'border-slate-700 bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {p.photoURL && (
                  <img
                    src={p.photoURL}
                    alt={p.displayName}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {p.displayName}
                    {isMe && (
                      <span className="ml-1 text-xs text-slate-400">（你）</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">符號：{p.symbol}</p>
                </div>
                <span
                  className={`text-2xl font-bold ${
                    p.symbol === 'X' ? 'text-blue-400' : 'text-red-400'
                  }`}
                >
                  {p.symbol}
                </span>
              </div>
              <p className={`mt-2 text-center text-xs font-semibold ${
                isWinner ? 'text-yellow-400' : 'text-slate-500'
              }`}>
                {room.isDraw
                  ? '平手'
                  : isWinner
                    ? '獲勝'
                    : outcome === 'lose' && isMe
                      ? '落敗'
                      : '落敗'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        {countdownActive ? (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-center text-sm text-slate-400">
              {countdown} 秒後自動離開房間
            </p>
          </>
        ) : (
          <p className="text-center text-sm text-slate-400">
            自動離開已暫停
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {countdownActive ? (
          <button
            onClick={() => setCountdownActive(false)}
            disabled={leaving}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            留在此頁
          </button>
        ) : (
          <button
            onClick={() => {
              setCountdown(autoLeaveSeconds);
              setCountdownActive(true);
            }}
            disabled={leaving}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            恢復自動離開
          </button>
        )}

        {isHost && (
          <button
            onClick={onPlayAgain}
            disabled={leaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            再來一局
          </button>
        )}

        <button
          onClick={onLeave}
          disabled={leaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {leaving ? '離開中...' : '立即離開'}
        </button>
      </div>
    </section>
  );
}
