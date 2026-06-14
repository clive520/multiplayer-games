import type { ReactNode } from 'react';
import { TurnCountdown } from './TurnCountdown';
import { PlayerBadge } from './PlayerBadge';

/**
 * 遊戲狀態（discriminated union）— 各遊戲用來描述當前 header 該顯示什麼訊息
 */
export type GameHeaderStatus =
  | { kind: 'won'; winnerName: string }
  | { kind: 'draw' }
  | { kind: 'myTurn'; symbol: string }
  | { kind: 'opponentTurn'; symbol: string; verb: '下棋' | '落子' }
  | { kind: 'spectating'; symbol: string; verb: '下棋' | '落子' };

interface GameHeaderProps {
  /** 遊戲狀態（決定標題文字 + 顏色） */
  status: GameHeaderStatus;
  /** 格式化棋子符號（黑棋/白棋/X/O 等）— 由各遊戲傳入 */
  formatSymbol?: (symbol: string) => string;
  /** 當前回合剩餘秒數（null 表示不顯示倒數） */
  turnSecondsLeft?: number | null;
  /** 當前房間設定的每回合總秒數 */
  turnTimeLimitSec?: number;
  /** 玩家列表（顯示在 header 右側）— 選填，reversi 不傳 */
  players?: Array<{ uid: string; symbol: string; displayName: string }>;
  /** 當前使用者 uid（用於玩家徽章高亮） */
  currentUserId?: string;
  /** 右側額外內容（如 reversi 的 X/O 計數、按鈕）— 顯示在 players 後面 */
  rightContent?: ReactNode;
  /** 額外附加文字（如 reversi 的「已連續 Pass N 次」），會插在符號和倒數中間 */
  extraHint?: ReactNode;
}

/**
 * 遊戲 header 列：標題（輪到你/等待/觀戰中/獲勝/平手）+ 倒數 + 玩家徽章 + 額外右側內容
 * 三個遊戲元件共用此元件，避免重複的版面結構
 */
export function GameHeader({
  status,
  formatSymbol,
  turnSecondsLeft,
  turnTimeLimitSec,
  players,
  currentUserId,
  rightContent,
  extraHint,
}: GameHeaderProps) {
  const f = formatSymbol ?? ((s: string) => s);

  let statusNode: ReactNode;
  switch (status.kind) {
    case 'won':
      statusNode = (
        <p className="text-lg font-semibold text-yellow-400">
          {status.winnerName} 獲勝！
        </p>
      );
      break;
    case 'draw':
      statusNode = (
        <p className="text-lg font-semibold text-slate-300">平手！</p>
      );
      break;
    case 'myTurn':
      statusNode = (
        <p className="text-lg font-semibold text-green-400">
          輪到你（{f(status.symbol)}）
          {extraHint}
          <TurnCountdown
            secondsLeft={turnSecondsLeft}
            totalSec={turnTimeLimitSec}
          />
        </p>
      );
      break;
    case 'opponentTurn':
      statusNode = (
        <p className="text-lg text-slate-400">
          等待對方{status.verb}（{f(status.symbol)}）
          {extraHint}
          <TurnCountdown
            secondsLeft={turnSecondsLeft}
            totalSec={turnTimeLimitSec}
          />
        </p>
      );
      break;
    case 'spectating':
      statusNode = (
        <p className="text-lg text-slate-400">
          觀戰中（{f(status.symbol)} {status.verb}）
          {extraHint}
          <TurnCountdown
            secondsLeft={turnSecondsLeft}
            totalSec={turnTimeLimitSec}
          />
        </p>
      );
      break;
  }

  const showRightSide = players || rightContent;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div>{statusNode}</div>
      {showRightSide && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {players?.map((p) => (
            <PlayerBadge
              key={p.uid}
              symbol={p.symbol}
              displayName={p.displayName}
              isMe={p.uid === currentUserId}
              formatSymbol={formatSymbol}
            />
          ))}
          {rightContent}
        </div>
      )}
    </div>
  );
}
