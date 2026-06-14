import { useEffect, useState, useRef } from 'react';
import type { Room } from '../types/room';

interface ResultScreenProps {
  room: Room;
  currentUserId: string;
  isHost: boolean;
  leaving: boolean;
  onLeave: () => void;
  onPlayAgain: () => void;
  autoLeaveSeconds?: number;
  /** 觀戰者設為 true：不自動離開、可選擇「返回大廳」手動離開（IMPROVEMENTS #8） */
  disableAutoLeave?: boolean;
  /** 觀戰者身份（影響訊息文案） */
  isSpectator?: boolean;
}

type Outcome = 'win' | 'lose' | 'draw';

interface Reaction {
  id: string;
  emoji: string;
  /** 水平位置（百分比），避免 emoji 全部擠在中間 */
  xPct: number;
}

const REACTION_OPTIONS: ReadonlyArray<{ emoji: string; label: string }> = [
  { emoji: '👏', label: '加油' },
  { emoji: '🎉', label: '祝賀' },
  { emoji: '😱', label: '驚訝' },
  { emoji: '👍', label: '佩服' },
  { emoji: '💪', label: '鼓勵' },
];

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
  disableAutoLeave = false,
  isSpectator = false,
}: ResultScreenProps) {
  const [countdown, setCountdown] = useState(autoLeaveSeconds);
  // 觀戰者預設不啟用倒數（disableAutoLeave 或 isSpectator）
  const [countdownActive, setCountdownActive] = useState(!disableAutoLeave && !isSpectator);
  const [hasAutoLeft, setHasAutoLeft] = useState(false);

  // 觀戰者反應（IMPROVEMENTS #8）：點擊表情按鈕，emoji 飄起來
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const reactionIdRef = useRef(0);

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

  const sendReaction = (emoji: string) => {
    const id = `reaction-${++reactionIdRef.current}`;
    // 隨機水平位置（10% ~ 90%）讓 emoji 不會全部擠在中間
    const xPct = 10 + Math.random() * 80;
    setReactions((prev) => [...prev, { id, emoji, xPct }]);
    // 3 秒後自動移除（與動畫時間一致）
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  };

  const outcome = getOutcome(room, currentUserId);
  const style = OUTCOME_STYLE[outcome];
  const winner = room.players.find((p) => p.uid === room.winnerId) ?? null;
  const progressPct = Math.max(0, Math.min(100, (countdown / autoLeaveSeconds) * 100));

  return (
    <section
      data-testid="result-screen"
      data-outcome={outcome}
      className={`relative rounded-xl border-2 ${style.border} ${style.bg} p-8 shadow-xl`}
    >
      {/* 觀戰者反應浮動層 */}
      {reactions.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {reactions.map((r) => (
            <span
              key={r.id}
              className="animate-reaction-float absolute bottom-12 text-3xl"
              style={{ left: `${r.xPct}%` }}
            >
              {r.emoji}
            </span>
          ))}
        </div>
      )}

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

        {isSpectator && (
          <p className="mt-2 text-xs text-blue-300">（你正在觀戰這場比賽）</p>
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

      {/* 觀戰者反應按鈕列（IMPROVEMENTS #8） */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {REACTION_OPTIONS.map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={() => sendReaction(r.emoji)}
            disabled={leaving}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xl hover:scale-110 hover:bg-slate-700 disabled:opacity-50"
            title={r.label}
            aria-label={`傳送反應：${r.label}`}
          >
            {r.emoji}
          </button>
        ))}
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
            {disableAutoLeave || isSpectator
              ? '觀戰者可自由留下，無自動離開'
              : '自動離開已暫停'}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {/* 觀戰者用：可重新啟動自動離開 */}
        {isSpectator && !countdownActive && (
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

        {/* 玩家用：可暫停自動離開 */}
        {!isSpectator && !disableAutoLeave && countdownActive && (
          <button
            onClick={() => setCountdownActive(false)}
            disabled={leaving}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            留在此頁
          </button>
        )}

        {/* 觀戰者用：手動返回大廳（明顯 CTA） */}
        {isSpectator && (
          <button
            onClick={onLeave}
            disabled={leaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {leaving ? '離開中...' : '返回大廳'}
          </button>
        )}

        {/* 玩家用：再來一局（僅房主） */}
        {isHost && !isSpectator && (
          <button
            onClick={onPlayAgain}
            disabled={leaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            再來一局
          </button>
        )}

        {/* 玩家用：立即離開 */}
        {!isSpectator && (
          <button
            onClick={onLeave}
            disabled={leaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {leaving ? '離開中...' : '立即離開'}
          </button>
        )}
      </div>
    </section>
  );
}
