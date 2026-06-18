type IconProps = { className?: string };

/**
 * 點點連連 Icon（用於 Lobby 房間卡片、Profile 列表等）
 * 簡化設計：4x4 網格 + 幾條畫過的線 + 一些被拿走的方格
 */
export default function DotsAndBoxesIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 4x4 方格背景（簡化用 3 個） */}
      <rect x="3" y="3" width="5" height="5" className="fill-sky-200 dark:fill-sky-900/30" rx="0.5" />
      <rect x="9" y="3" width="5" height="5" className="fill-rose-200 dark:fill-rose-900/30" rx="0.5" />
      <rect x="15" y="3" width="5" height="5" className="fill-sky-200 dark:fill-sky-900/30" rx="0.5" />
      <rect x="3" y="9" width="5" height="5" className="fill-rose-200 dark:fill-rose-900/30" rx="0.5" />
      <rect x="9" y="9" width="5" height="5" className="fill-sky-200 dark:fill-sky-900/30" rx="0.5" />
      <rect x="15" y="9" width="5" height="5" className="fill-rose-200 dark:fill-rose-900/30" rx="0.5" />
      <rect x="3" y="15" width="5" height="5" className="fill-rose-200 dark:fill-rose-900/30" rx="0.5" />
      <rect x="9" y="15" width="5" height="5" className="fill-sky-200 dark:fill-sky-900/30" rx="0.5" />
      <rect x="15" y="15" width="5" height="5" className="fill-rose-200 dark:fill-rose-900/30" rx="0.5" />
      {/* 點（dot 簡化用小圓） */}
      <circle cx="3" cy="3" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="8" cy="3" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="13" cy="3" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="20" cy="3" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="3" cy="8" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="8" cy="8" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="13" cy="8" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="20" cy="8" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="3" cy="14" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="8" cy="14" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="13" cy="14" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="20" cy="14" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="3" cy="20" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="8" cy="20" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="13" cy="20" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
      <circle cx="20" cy="20" r="0.8" className="fill-gray-700 dark:fill-gray-300" />
    </svg>
  );
}
