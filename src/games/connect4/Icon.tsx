type IconProps = { className?: string };

/**
 * 四子棋 Icon（用於 Lobby 房間卡片、Profile 列表等）
 * 簡化設計：3 個圓圈（X 紅、O 黃、空）+ 棋盤網格
 */
export default function Connect4Icon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 棋盤外框 */}
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        className="fill-amber-200 dark:fill-amber-900/30 stroke-amber-900 dark:stroke-amber-700"
        strokeWidth="1.5"
      />
      {/* 格子 3x3 簡化（代表棋盤） */}
      {/* 紅棋 */}
      <circle cx="7" cy="8" r="1.8" className="fill-red-500" />
      <circle cx="12" cy="12" r="1.8" className="fill-red-500" />
      <circle cx="17" cy="16" r="1.8" className="fill-red-500" />
      {/* 黃棋 */}
      <circle cx="7" cy="16" r="1.8" className="fill-yellow-400 stroke-amber-700" strokeWidth="0.5" />
      <circle cx="12" cy="8" r="1.8" className="fill-yellow-400 stroke-amber-700" strokeWidth="0.5" />
      <circle cx="17" cy="12" r="1.8" className="fill-yellow-400 stroke-amber-700" strokeWidth="0.5" />
    </svg>
  );
}
