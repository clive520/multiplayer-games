import type { ReactNode } from 'react';

interface TurnCountdownProps {
  secondsLeft: number | null | undefined;
  totalSec?: number;
  className?: string;
}

/**
 * 回合倒數顯示器：剩餘秒數 > 10 綠色、5-10 黃色、< 5 紅色 + 動畫
 * 若傳入 totalSec，會一併顯示總秒數（如「剩餘 25/60 秒」）
 */
export function TurnCountdown({
  secondsLeft,
  totalSec,
  className = '',
}: TurnCountdownProps): ReactNode {
  if (secondsLeft == null) return null;
  let colorClass = 'dark:text-slate-400 text-slate-600';
  if (secondsLeft <= 5) {
    colorClass = 'text-red-400 animate-pulse font-bold';
  } else if (secondsLeft <= 10) {
    colorClass = 'text-yellow-400';
  } else {
    colorClass = 'dark:text-slate-300 text-slate-700';
  }
  const totalText = totalSec ? `/${totalSec}` : '';
  return (
    <span
      className={`ml-2 inline-flex items-center gap-1 rounded dark:bg-slate-900 bg-slate-50/60 px-2 py-0.5 text-sm ${colorClass} ${className}`}
      title={`每回合 ${totalSec ?? 30} 秒，超時自動判當前玩家落敗`}
    >
      <span aria-hidden>⏱</span>
      剩餘 {secondsLeft}{totalText} 秒
    </span>
  );
}
