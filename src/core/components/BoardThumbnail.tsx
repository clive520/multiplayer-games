import type { GameType } from '../types/room';

interface BoardThumbnailProps {
  gameType: GameType;
  /** 棋盤陣列（Cell[]）；若 undefined 顯示空棋盤 */
  board?: ReadonlyArray<string>;
  /** 縮圖尺寸（每格 px），預設 18 */
  cellSize?: number;
}

/**
 * 棋盤縮圖（IMPROVEMENTS #7）
 * 用於大廳房間 hover 預覽，讓使用者進房前先看到當前戰況
 *
 * 不同遊戲的渲染策略：
 * - tictactoe：3x3 文字格（X / O）
 * - gomoku：15x15 太密不易看，僅顯示「已下 N 步」與「最後一手」
 * - reversi：8x8 黑白圓盤
 */
export function BoardThumbnail({ gameType, board, cellSize = 18 }: BoardThumbnailProps) {
  if (gameType === 'tictactoe') {
    const cells = board ?? Array(9).fill('');
    return (
      <div
        className="grid gap-0.5 rounded border dark:border-slate-700 border-app-border dark:bg-slate-900 bg-slate-50 p-1"
        style={{
          gridTemplateColumns: `repeat(3, ${cellSize}px)`,
          gridTemplateRows: `repeat(3, ${cellSize}px)`,
        }}
        aria-label="井字棋盤縮圖"
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-center dark:bg-slate-800 bg-app-card text-xs font-bold"
            style={{ width: cellSize, height: cellSize }}
          >
            {c === 'X' && <span className="text-blue-400">×</span>}
            {c === 'O' && <span className="text-red-400">○</span>}
          </div>
        ))}
      </div>
    );
  }

  if (gameType === 'reversi') {
    const cells = board ?? Array(64).fill('');
    let xCount = 0;
    let oCount = 0;
    for (const c of cells) {
      if (c === 'X') xCount++;
      else if (c === 'O') oCount++;
    }
    return (
      <div className="flex items-center gap-3">
        <div
          className="grid gap-0.5 rounded border border-emerald-900/50 bg-emerald-900/20 p-1"
          style={{
            gridTemplateColumns: `repeat(8, ${cellSize}px)`,
            gridTemplateRows: `repeat(8, ${cellSize}px)`,
          }}
          aria-label="黑白棋棋盤縮圖"
        >
          {cells.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ width: cellSize, height: cellSize }}
            >
              {c === 'X' && <div className="h-3 w-3 rounded-full bg-zinc-900" />}
              {c === 'O' && <div className="h-3 w-3 rounded-full bg-white" />}
            </div>
          ))}
        </div>
        <div className="text-xs dark:text-slate-400 text-slate-600">
          <div>黑 {xCount}</div>
          <div>白 {oCount}</div>
        </div>
      </div>
    );
  }

  // gomoku：15x15 太密不易看，僅顯示摘要
  if (gameType === 'gomoku') {
    const moveCount = board?.filter((c) => c !== '').length ?? 0;
    return (
      <div className="flex items-center gap-2 rounded border border-amber-900/50 bg-amber-900/20 px-3 py-2 text-xs dark:text-slate-300 text-slate-700">
        <span>已下 {moveCount} / 225 子</span>
        <span className="text-slate-500">（15×15 棋盤縮圖省略）</span>
      </div>
    );
  }

  // connect4：7x6 棋盤，用紅圓/黃圓環表示
  if (gameType === 'connect4') {
    const cells = board ?? Array(42).fill('');
    return (
      <div
        className="grid gap-0.5 rounded border border-amber-900/30 bg-amber-50 p-1"
        style={{
          gridTemplateColumns: `repeat(7, ${Math.round(cellSize * 0.6)}px)`,
          gridTemplateRows: `repeat(6, ${Math.round(cellSize * 0.6)}px)`,
        }}
        aria-label="四子棋棋盤縮圖"
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              width: Math.round(cellSize * 0.6),
              height: Math.round(cellSize * 0.6),
            }}
          >
            {c === 'X' && <div className="h-3 w-3 rounded-full bg-red-500" />}
            {c === 'O' && <div className="h-3 w-3 rounded-full bg-yellow-400 ring-1 ring-amber-700" />}
          </div>
        ))}
      </div>
    );
  }

  // dotsandboxes：4x4 方格，用 4 個小方格代表誰佔領（X 藍/O 紅）
  if (gameType === 'dotsandboxes') {
    const cells = board ?? Array(16).fill(null);
    return (
      <div
        className="grid gap-0.5 rounded border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-1"
        style={{
          gridTemplateColumns: `repeat(4, ${cellSize}px)`,
          gridTemplateRows: `repeat(4, ${cellSize}px)`,
        }}
        aria-label="點點連連棋盤縮圖"
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ width: cellSize, height: cellSize }}
          >
            {c === 'X' && <div className="h-3 w-3 rounded-sm bg-blue-500 opacity-60" />}
            {c === 'O' && <div className="h-3 w-3 rounded-sm bg-rose-500 opacity-60" />}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
