interface PlayerBadgeProps {
  symbol: string;
  displayName: string;
  isMe?: boolean;
  formatSymbol?: (symbol: string) => string;
}

/**
 * 玩家徽章：在 GameHeader 右側顯示「(符號): 暱稱」的簡潔小標籤
 * 自己的玩家會用藍色背景高亮
 */
export function PlayerBadge({
  symbol,
  displayName,
  isMe = false,
  formatSymbol,
}: PlayerBadgeProps) {
  const label = formatSymbol ? formatSymbol(symbol) : symbol;
  return (
    <div
      className={`rounded px-2 py-1 ${
        isMe
          ? 'bg-blue-900/50 text-blue-300'
          : 'dark:bg-slate-700 bg-app-hover dark:text-slate-300 text-slate-700'
      }`}
    >
      {label}: {displayName}
    </div>
  );
}
