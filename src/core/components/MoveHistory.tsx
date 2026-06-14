import { useState } from 'react';
import type { MoveRecord } from '../types/game';

interface MoveHistoryProps {
  moves: ReadonlyArray<MoveRecord>;
  currentUserId: string;
  formatSymbol?: (symbol: string) => string;
}

/**
 * 格式化時間戳：顯示 HH:MM:SS
 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 棋譜面板（IMPROVEMENTS #6）
 * 顯示在 GameRoom 右側；玩家可看到所有下棋紀錄
 *
 * - 每步顯示：序號 / 玩家名 / 棋子（透過 formatSymbol 格式化）/ 座標 / 時間
 * - 自己的步驟用藍色背景高亮
 * - 最後一步有左側綠色指示條
 * - 行動版可摺疊（手機友善）
 */
export function MoveHistory({ moves, currentUserId, formatSymbol }: MoveHistoryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const f = formatSymbol ?? ((s: string) => s);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mb-3 flex w-full items-center justify-between text-left"
        aria-expanded={!collapsed}
      >
        <h3 className="text-sm font-semibold text-slate-300">
          棋譜（{moves.length}）
        </h3>
        <span className="text-xs text-slate-500 lg:hidden">
          {collapsed ? '展開 ▾' : '收合 ▴'}
        </span>
      </button>

      {!collapsed && (
        <>
          {moves.length === 0 ? (
            <p className="text-xs text-slate-500">還沒有任何步驟</p>
          ) : (
            <ol
              className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 text-sm"
              aria-label="棋譜歷史"
            >
              {moves.map((m, idx) => {
                const isLast = idx === moves.length - 1;
                const isMine = m.uid === currentUserId;
                return (
                  <li
                    key={`${m.timestamp}-${idx}`}
                    className={`flex items-center gap-2 rounded px-2 py-1 ${
                      isMine ? 'bg-blue-900/30' : 'bg-slate-900/30'
                    } ${isLast ? 'border-l-2 border-green-400' : ''}`}
                  >
                    <span className="w-6 text-right text-xs text-slate-500">
                      {idx + 1}.
                    </span>
                    <span className="flex-1 truncate text-xs">
                      <span className="font-medium">{m.displayName}</span>
                      <span className="ml-1 text-slate-400">（{f(m.symbol)}）</span>
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      ({m.row},{m.col})
                    </span>
                    <span className="hidden text-xs text-slate-600 sm:inline">
                      {formatTime(m.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
