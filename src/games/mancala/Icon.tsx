type IconProps = { className?: string };

/**
 * 播棋 Icon（用於 Lobby 房間卡片、Profile 列表等）
 * 簡化設計：兩排圓坑 + 一些種子
 */
export default function MancalaIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 上排 6 個 pit */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse
          key={`top-${i}`}
          cx={3 + i * 3}
          cy={5}
          rx={1.3}
          ry={1.5}
          className="fill-amber-200 dark:fill-amber-900/30 stroke-amber-900 dark:stroke-amber-700"
          strokeWidth="0.5"
        />
      ))}
      {/* 上排 store（左） */}
      <rect
        x={1}
        y={7}
        width={3}
        height={10}
        rx={1.5}
        className="fill-amber-300 dark:fill-amber-800/40 stroke-amber-900 dark:stroke-amber-700"
        strokeWidth="0.5"
      />
      {/* 下排 6 個 pit */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse
          key={`bot-${i}`}
          cx={3 + i * 3}
          cy={19}
          rx={1.3}
          ry={1.5}
          className="fill-amber-200 dark:fill-amber-900/30 stroke-amber-900 dark:stroke-amber-700"
          strokeWidth="0.5"
        />
      ))}
      {/* 下排 store（右） */}
      <rect
        x={20}
        y={7}
        width={3}
        height={10}
        rx={1.5}
        className="fill-amber-300 dark:fill-amber-800/40 stroke-amber-900 dark:stroke-amber-700"
        strokeWidth="0.5"
      />
      {/* 幾顆種子（裝飾） */}
      <circle cx="6" cy="5" r="0.4" className="fill-amber-700 dark:fill-amber-300" />
      <circle cx="15" cy="19" r="0.4" className="fill-amber-700 dark:fill-amber-300" />
      <circle cx="18" cy="19" r="0.4" className="fill-amber-700 dark:fill-amber-300" />
    </svg>
  );
}
