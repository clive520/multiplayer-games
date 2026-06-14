interface IconProps {
  className?: string;
}

export default function ReversiIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="黑白棋"
    >
      {/* 棋盤框（淺綠/灰底，模擬棋盤） */}
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="2.5"
        fill="currentColor"
        opacity="0.18"
      />
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.5"
      />
      {/* 棋盤格線（中線 1 條橫、1 條直） */}
      <line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" strokeWidth="0.8" opacity="0.45" />
      <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.45" />
      {/* 四顆棋子：黑、白、白、黑 */}
      <circle cx="9" cy="9" r="4" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
      <circle cx="23" cy="9" r="4" fill="#f4f4f5" stroke="#a1a1aa" strokeWidth="0.8" />
      <circle cx="9" cy="23" r="4" fill="#f4f4f5" stroke="#a1a1aa" strokeWidth="0.8" />
      <circle cx="23" cy="23" r="4" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
    </svg>
  );
}
