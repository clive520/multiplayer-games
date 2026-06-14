interface IconProps {
  className?: string;
}

export default function GomokuIcon({ className }: IconProps) {
  // 5 顆黑子連成一線（水平）
  const cx = [6, 12, 18, 24, 30];
  const cy = 16;
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="五子棋"
    >
      {/* 棋盤框 */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="2.5"
        fill="currentColor"
        opacity="0.12"
      />
      {/* 棋盤格線（3 條橫、3 條直，加上邊框） */}
      <line x1="2" y1="11" x2="30" y2="11" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="2" y1="21" x2="30" y2="21" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="11" y1="2" x2="11" y2="30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="21" y1="2" x2="21" y2="30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      {/* 五子連珠：5 顆黑子 */}
      {cx.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={cy}
          r="2.6"
          fill="#27272a"
          stroke="#52525b"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}
