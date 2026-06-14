interface IconProps {
  className?: string;
}

export default function TicTacToeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="井字遊戲"
    >
      {/* 3x3 棋盤框 */}
      <rect
        x="3.75"
        y="3.75"
        width="24.5"
        height="24.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.45"
      />
      {/* 棋盤格線 */}
      <line x1="12" y1="4" x2="12" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <line x1="20" y1="4" x2="20" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <line x1="4" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      {/* X（左上格）藍色 */}
      <g stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
        <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" />
        <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" />
      </g>
      {/* O（中間格）紅色 */}
      <circle
        cx="16"
        cy="16"
        r="3.25"
        stroke="#f87171"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
