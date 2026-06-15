import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Room } from '../types/room';
import { sendReaction, subscribeReactions, type RoomReaction } from '../services/reactionsService';
import { REACTION_SOUNDS } from '../utils/sound';

interface ResultScreenProps {
  room: Room;
  currentUserId: string;
  /** 當前使用者的暱稱（用於反應訊息附名） */
  currentUserDisplayName: string;
  isHost: boolean;
  leaving: boolean;
  onLeave: () => void;
  onPlayAgain: () => void;
  /** 觀戰者身份（影響訊息文案與外框顏色） */
  isSpectator?: boolean;
}

type Outcome = 'win' | 'lose' | 'draw' | 'observer';

interface ReactionStyle {
  border: string;
  bg: string;
  subtitle: string;
  accent: string;
}

const REACTION_KEYS = ['cheer', 'congrats', 'surprise', 'respect', 'encourage'] as const;
type ReactionKey = (typeof REACTION_KEYS)[number];

// 可愛版本：🫶 🎀 🥰 💖 ✨（比原本的 👏 🎉 😱 👍 💪 更軟、更 kawaii）
const REACTION_EMOJI: Record<ReactionKey, string> = {
  cheer: '🫶',        // heart hands
  congrats: '🎀',     // ribbon
  surprise: '🥰',     // smiling face with hearts
  respect: '💖',      // sparkling heart
  encourage: '✨',    // sparkles
};

// 對應到 REACTION_SOUNDS 的音效函式
const REACTION_SOUND_MAP: Record<ReactionKey, () => void> = {
  cheer: REACTION_SOUNDS.cheer,
  congrats: REACTION_SOUNDS.congrats,
  surprise: REACTION_SOUNDS.surprise,
  respect: REACTION_SOUNDS.respect,
  encourage: REACTION_SOUNDS.encourage,
};

function getOutcome(room: Room, currentUserId: string, isSpectator: boolean): Outcome {
  if (isSpectator) return 'observer';
  if (room.isDraw) return 'draw';
  if (room.winnerId && room.winnerId === currentUserId) return 'win';
  return 'lose';
}

const OUTCOME_STYLE: Record<Outcome, ReactionStyle> = {
  win: {
    border: 'border-yellow-500',
    bg: 'bg-gradient-to-b from-yellow-900/30 to-slate-800',
    subtitle: 'text-yellow-300',
    accent: 'text-yellow-400',
  },
  lose: {
    border: 'border-red-700',
    bg: 'bg-gradient-to-b from-red-900/20 to-slate-800',
    subtitle: 'text-red-300',
    accent: 'text-red-400',
  },
  draw: {
    border: 'border-slate-500',
    bg: 'bg-gradient-to-b from-slate-700/40 to-slate-800',
    subtitle: 'text-slate-300',
    accent: 'text-slate-300',
  },
  observer: {
    border: 'border-blue-700',
    bg: 'bg-gradient-to-b from-blue-900/20 to-slate-800',
    subtitle: 'text-blue-300',
    accent: 'text-blue-400',
  },
};

export function ResultScreen({
  room,
  currentUserId,
  currentUserDisplayName,
  isHost,
  leaving,
  onLeave,
  onPlayAgain,
  isSpectator = false,
}: ResultScreenProps) {
  const { t } = useTranslation();
  // 廣播反應（IMPROVEMENTS #8 延伸）：點擊表情，RTDB 同步給所有玩家 + 觀戰者
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  useEffect(() => {
    if (!room.id) return;
    return subscribeReactions(room.id, setReactions);
  }, [room.id]);

  const handleSendReaction = (key: ReactionKey) => {
    if (leaving) return;
    // 播放對應音效（瀏覽器需要使用者互動，這裡的 click 算互動）
    try {
      REACTION_SOUND_MAP[key]();
    } catch {
      // 音效失敗不擋功能
    }
    sendReaction(room.id, {
      emoji: REACTION_EMOJI[key],
      uid: currentUserId,
      displayName: currentUserDisplayName,
    });
  };

  const outcome = getOutcome(room, currentUserId, isSpectator);
  const style = OUTCOME_STYLE[outcome];
  const winner = room.players.find((p) => p.uid === room.winnerId) ?? null;
  const outcomeTitle: Record<Outcome, string> = {
    win: t('resultScreen.youWin'),
    lose: t('resultScreen.youLose'),
    draw: t('resultScreen.draw'),
    observer: t('resultScreen.spectating'),
  };

  return (
    <section
      data-testid="result-screen"
      data-outcome={outcome}
      className={`relative rounded-xl border-2 ${style.border} ${style.bg} p-8 shadow-xl`}
    >
      {/* 廣播反應浮動層（觀戰者 + 玩家共用，RTDB 同步給所有人） */}
      {reactions.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {reactions.map((r) => (
            <div
              key={r.id}
              data-testid="reaction-bubble"
              className="animate-reaction-float absolute bottom-12 text-center"
              style={{ left: `${r.xPct}%`, transform: 'translateX(-50%)' }}
            >
              <div className="text-3xl drop-shadow-lg">{r.emoji}</div>
              <div className="mt-1 whitespace-nowrap rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">
                {r.displayName}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <p className={`text-xs font-semibold uppercase tracking-widest ${style.subtitle}`}>
          {t('resultScreen.gameOver')}
        </p>
        <h2 className={`mt-2 text-4xl font-bold ${style.accent}`}>{outcomeTitle[outcome]}</h2>

        {!room.isDraw && winner && (
          <p className="mt-3 text-slate-300">
            {t('resultScreen.winnerLabel')}
            <span className="font-semibold text-white">{winner.displayName}</span>
            <span className="ml-2 text-slate-500">（{winner.symbol}）</span>
          </p>
        )}

        {room.isDraw && (
          <p className="mt-3 text-slate-400">{t('resultScreen.drawDescription')}</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {room.players.map((p) => {
          const isMe = !isSpectator && p.uid === currentUserId;
          const isWinner = p.uid === room.winnerId;
          const isDraw = room.isDraw;
          const isLoser = !isDraw && !isWinner;
          return (
            <div
              key={p.uid}
              className={`rounded-lg border p-3 ${
                isWinner
                  ? 'border-yellow-500 bg-yellow-900/20'
                  : isLoser && isMe
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
                      <span className="ml-1 text-xs text-slate-400">{t('common.you')}</span>
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
                isDraw ? 'text-slate-300' : isWinner ? 'text-yellow-400' : 'text-slate-500'
              }`}>
                {isDraw ? t('resultScreen.drawShort') : isWinner ? t('resultScreen.win') : t('resultScreen.lose')}
              </p>
            </div>
          );
        })}
      </div>

      {/* 反應按鈕列：所有在房間的人（玩家 + 觀戰者）都可按，廣播給所有人 */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {REACTION_KEYS.map((rk) => (
          <button
            key={rk}
            type="button"
            onClick={() => handleSendReaction(rk)}
            disabled={leaving}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xl hover:scale-110 hover:bg-slate-700 disabled:opacity-50"
            title={t(`resultScreen.reactions.${rk}`)}
            aria-label={t('resultScreen.reactionsAria', { label: t(`resultScreen.reactions.${rk}`) })}
          >
            {REACTION_EMOJI[rk]}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {/* 房主：再來一局 */}
        {isHost && !isSpectator && (
          <button
            onClick={onPlayAgain}
            disabled={leaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {leaving ? t('resultScreen.processing') : t('resultScreen.playAgain')}
          </button>
        )}

        {/* 所有人（玩家 + 觀戰者 + 房主）：手動離開 */}
        <button
          onClick={onLeave}
          disabled={leaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {leaving ? t('resultScreen.leaving') : t('resultScreen.backToLobby')}
        </button>
      </div>
    </section>
  );
}
