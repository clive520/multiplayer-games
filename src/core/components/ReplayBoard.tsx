import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MoveRecord } from '../types/game';

export interface ReplayBoardProps {
  /** 棋譜（每筆含 boardAfter 快照） */
  moves: ReadonlyArray<MoveRecord>;
  /** 棋盤初始狀態（slider 在 0 時的棋盤） */
  initialBoard: ReadonlyArray<string>;
  /** 棋盤邊長（3 = 井字、8 = 黑白棋、15 = 五子棋） */
  boardSize: number;
  /** 棋盤外框 + 底色 className（每個遊戲不同） */
  boardClassName?: string;
  /** 渲染單一格子的 React node（cell 是 'X' / 'O' / ''） */
  renderCell: (cell: string, isLastMoveHere: boolean, isFlipped: boolean) => ReactNode;
  /** 每格最大 px（預設依 boardSize 自動） */
  maxCellPx?: number;
}

/**
 * 棋盤復盤元件（IMPROVEMENTS #12 Phase B）
 *
 * - 時間軸 slider 0..moves.length
 * - 0 = 初始棋盤（initialBoard）
 * - i = 套用 moves[0..i-1] 後的棋盤（即 moves[i-1].boardAfter）
 * - 自動播放：每 1 秒前進一步
 * - 上一步 / 下一步按鈕
 * - 高亮「目前這步下的位置」與「被翻的棋子」（reversi 用）
 *
 * 注意：
 * - 若 moves 沒有 boardAfter，顯示「資料過舊，無法復盤」訊息
 * - 棋盤是唯讀的（不能點擊）
 */
export function ReplayBoard({
  moves,
  initialBoard,
  boardSize,
  boardClassName = 'dark:bg-slate-800 bg-app-card border dark:border-slate-700 border-app-border',
  renderCell,
  maxCellPx,
}: ReplayBoardProps) {
  const { t } = useTranslation();
  // slider 位置：0 = 初始，1 = 套用 moves[0]，N = 套用 moves[0..N-1]
  const [step, setStep] = useState(moves.length);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<number | null>(null);

  // 當 moves 變化（resetRoom 換新遊戲）時，把 step 重設到最後
  useEffect(() => {
    setStep(moves.length);
    setPlaying(false);
  }, [moves]);

  // 自動播放
  useEffect(() => {
    if (!playing) {
      if (playRef.current !== null) {
        window.clearInterval(playRef.current);
        playRef.current = null;
      }
      return;
    }
    if (step >= moves.length) {
      setPlaying(false);
      return;
    }
    playRef.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= moves.length) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1000);
    return () => {
      if (playRef.current !== null) {
        window.clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [playing, step, moves.length]);

  // 計算目前顯示的棋盤
  const currentBoard: ReadonlyArray<string> =
    step === 0
      ? initialBoard
      : (moves[step - 1]?.boardAfter ?? initialBoard);

  const lastMove = step > 0 ? moves[step - 1] : null;
  const lastMoveKey = lastMove ? `${lastMove.row},${lastMove.col}` : null;
  const flippedSet = new Set<string>();
  if (lastMove?.flipped) {
    for (const { row, col } of lastMove.flipped) {
      flippedSet.add(`${row},${col}`);
    }
  }

  const cellPx = maxCellPx ?? Math.max(16, Math.min(40, Math.floor(400 / boardSize)));
  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);
  const handleNext = useCallback(() => {
    setStep((s) => Math.min(moves.length, s + 1));
  }, [moves.length]);
  const handleTogglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      // 從頭開始播放（如果在最後）
      if (step >= moves.length) setStep(0);
      setPlaying(true);
    }
  }, [playing, step, moves.length]);

  // 檢查快照資料是否齊全
  const hasAnySnapshot = moves.length === 0 || moves[0].boardAfter !== undefined;
  if (!hasAnySnapshot) {
    return (
      <div className={`rounded-lg border p-4 ${boardClassName}`}>
        <p className="text-center text-sm dark:text-slate-400 text-slate-600">
          {t('replay.dataMissing')}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${boardClassName}`}>
      {/* 棋盤（縮圖版） */}
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
          aspectRatio: '1 / 1',
        }}
        aria-label={t('replay.boardLabel')}
      >
        {currentBoard.map((cell, idx) => {
          const row = Math.floor(idx / boardSize);
          const col = idx % boardSize;
          const isLastMoveHere = lastMoveKey === `${row},${col}`;
          const isFlipped = flippedSet.has(`${row},${col}`);
          return (
            <div
              key={idx}
              className="relative border border-current/10"
              style={{ minHeight: `${cellPx}px` }}
            >
              {renderCell(cell, isLastMoveHere, isFlipped)}
            </div>
          );
        })}
      </div>

      {/* 控制列 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={step <= 0}
          className="rounded dark:bg-slate-700 bg-app-hover px-2 py-1 text-sm dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
          aria-label={t('replay.prev')}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={moves.length === 0}
          className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1 text-sm font-medium dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
          aria-label={playing ? t('replay.pause') : t('replay.play')}
        >
          {playing ? '⏸' : '▶'} {playing ? t('replay.pause') : t('replay.play')}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={step >= moves.length}
          className="rounded dark:bg-slate-700 bg-app-hover px-2 py-1 text-sm dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
          aria-label={t('replay.next')}
        >
          ▶
        </button>
        <span className="text-sm dark:text-slate-300 text-slate-700">
          {t('replay.step', { current: step, total: moves.length })}
        </span>
      </div>

      {/* 時間軸 slider */}
      <input
        type="range"
        min={0}
        max={moves.length}
        value={step}
        onChange={(e) => {
          setPlaying(false);
          setStep(Number(e.target.value));
        }}
        className="mt-2 w-full"
        aria-label={t('replay.sliderLabel')}
      />

      {/* 這步資訊 */}
      {lastMove && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs dark:text-slate-400 text-slate-600">
          <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-blue-200">
            {t('replay.moveNumber', { n: step })}
          </span>
          <span className="font-medium dark:text-slate-200 text-slate-800">{lastMove.displayName}</span>
          <span>（{lastMove.symbol}）</span>
          <span className="font-mono">({lastMove.row},{lastMove.col})</span>
          {lastMove.flipped && lastMove.flipped.length > 0 && (
            <span className="rounded bg-yellow-900/40 px-1.5 py-0.5 text-yellow-200">
              {t('replay.flipped', { count: lastMove.flipped.length })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
