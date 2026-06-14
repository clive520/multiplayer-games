import { memo, type ReactNode } from 'react';

interface BoardCellProps {
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disabled: boolean;
  /** 最後落子的格子會顯示紅點（紅點位置透過 lastMovePosition 切換） */
  isLastMove?: boolean;
  /** 紅點位置：inner 偏內（重疊邊框）、outer 偏外（突出於邊框外） */
  lastMovePosition?: 'inner' | 'outer';
  /** 最後落子脈動光環：自動加 `animate-pulse-ring` class（IMPROVEMENTS #5） */
  lastMovePulse?: boolean;
  /** 此格剛被新放上棋子（fade-in 動畫）：自動加 `animate-cell-appear` class（IMPROVEMENTS #5） */
  isNewlyPlaced?: boolean;
  /**
   * 遊戲自訂的 className：包含顏色、邊框、hover 效果等
   * 元件本身只固定加 `relative aspect-square transition`
   */
  className?: string;
  /**
   * 選填的子節點：棋盤格內容（棋子符號、預覽圓圈、提示框等）
   * 元件本身只固定加 `pointer-events-none absolute` 給最後落子標記用
   */
  children: ReactNode;
}

/**
 * 棋盤格共用元件：固定處理 onClick / onMouseEnter / onMouseLeave / disabled / 最後落子紅點
 * 視覺樣式（背景色、邊框、hover 效果）由各遊戲透過 className 傳入
 * 遊戲內容（棋子渲染、hover 預覽）由 children 傳入
 * 動畫：透過 `lastMovePulse` 和 `isNewlyPlaced` 開關控制（IMPROVEMENTS #5）
 */
export const BoardCell = memo(function BoardCell({
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  isLastMove = false,
  lastMovePosition = 'inner',
  lastMovePulse = false,
  isNewlyPlaced = false,
  className = '',
  children,
}: BoardCellProps) {
  const lastMoveClasses =
    lastMovePosition === 'outer'
      ? 'pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500'
      : 'pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500';
  // 動畫 class：只在開啟時加，否則保留 transition 平滑過渡
  const animationClass = [
    isNewlyPlaced ? 'animate-cell-appear' : '',
    lastMovePulse ? 'animate-pulse-ring' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      className={`relative aspect-square transition ${animationClass} ${className}`}
    >
      {children}
      {isLastMove && <span className={lastMoveClasses} />}
    </button>
  );
});
