import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { MoveRecord } from '../../core/types/game';
import {
  BOX_ROWS,
  BOX_COLS,
  type EdgeDirection,
} from './types';

const SIZE = 360;
const PADDING = 20;
const CELL = (SIZE - 2 * PADDING) / BOX_COLS;

const COLOR: Record<'X' | 'O', string> = {
  X: '#2563eb',
  O: '#e11d48',
};

/** 將 boardAfter (flat array) 還原成 hEdges / vEdges / boxOwners */
function parseBoardFlat(flat: ReadonlyArray<string>): {
  hEdges: string[][];
  vEdges: string[][];
  boxOwners: string[][];
} {
  const hSize = (BOX_ROWS + 1) * BOX_COLS; // 5*4 = 20
  const vSize = BOX_ROWS * (BOX_COLS + 1); // 4*5 = 20
  const bSize = BOX_ROWS * BOX_COLS; // 16
  const hEdges: string[][] = [];
  for (let r = 0; r < BOX_ROWS + 1; r++) {
    hEdges.push(flat.slice(r * BOX_COLS, r * BOX_COLS + BOX_COLS));
  }
  const vEdges: string[][] = [];
  for (let r = 0; r < BOX_ROWS; r++) {
    vEdges.push(flat.slice(hSize + r * (BOX_COLS + 1), hSize + r * (BOX_COLS + 1) + (BOX_COLS + 1)));
  }
  const boxOwners: string[][] = [];
  for (let r = 0; r < BOX_ROWS; r++) {
    boxOwners.push(flat.slice(hSize + vSize + r * BOX_COLS, hSize + vSize + r * BOX_COLS + BOX_COLS));
  }
  // 防呆：shape 不對就回傳全空
  if (hEdges.length !== BOX_ROWS + 1 || vEdges.length !== BOX_ROWS || boxOwners.length !== BOX_ROWS) {
    return {
      hEdges: Array.from({ length: BOX_ROWS + 1 }, () => Array(BOX_COLS).fill('')),
      vEdges: Array.from({ length: BOX_ROWS }, () => Array(BOX_COLS + 1).fill('')),
      boxOwners: Array.from({ length: BOX_ROWS }, () => Array(BOX_COLS).fill('')),
    };
  }
  void hSize; void vSize; void bSize; // 變數用於推導尺寸（其實 slice 已經處理）
  return { hEdges, vEdges, boxOwners };
}

export interface DotsAndBoxesReplayBoardProps {
  moves: ReadonlyArray<MoveRecord>;
}

/**
 * 點點連連專用復盤元件（NEW_GAME_SOP 修正）
 *
 * 為什麼不做成通用 ReplayBoard 的 renderer：
 * - 通用 ReplayBoard 是 NxN 格子，dotsandboxes 是「點 + 邊 + 方格」混合結構
 * - 復盤必須看到「水平/垂直邊被畫上」的過程，不是方格被填滿的過程
 * - 最後一步的「邊」要特別高亮（畫的線比較粗、動畫）
 *
 * 棋譜 step 對應：
 * - step 0 = 初始棋盤（全空）
 * - step i = 套用 moves[0..i-1] 後的棋盤（看 moves[i-1].boardAfter）
 */
export function DotsAndBoxesReplayBoard({ moves }: DotsAndBoxesReplayBoardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(moves.length);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<number | null>(null);

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

  // 計算目前棋盤
  const flat = step === 0
    ? [
        ...Array((BOX_ROWS + 1) * BOX_COLS).fill(''),
        ...Array(BOX_ROWS * (BOX_COLS + 1)).fill(''),
        ...Array(BOX_ROWS * BOX_COLS).fill(''),
      ]
    : (moves[step - 1]?.boardAfter ?? []);
  const { hEdges, vEdges, boxOwners } = parseBoardFlat(flat);

  const lastMove = step > 0 ? moves[step - 1] : null;
  const lastEdgeType = (lastMove?.metadata?.type as EdgeDirection | undefined) ?? null;

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
      if (step >= moves.length) setStep(0);
      setPlaying(true);
    }
  }, [playing, step, moves.length]);

  // 檢查 boardAfter 是否齊全
  if (moves.length > 0 && moves[0].boardAfter === undefined) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4">
        <p className="text-center text-sm dark:text-slate-400 text-slate-600">
          {t('replay.dataMissing')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-3">
      {/* 棋盤 SVG（與實際遊戲一致） */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="rounded"
          style={{ width: '100%', maxWidth: SIZE }}
          role="img"
          aria-label="Dots and Boxes replay"
        >
          {/* 方格所有權 */}
          {boxOwners.map((row, r) =>
            row.map((owner, c) => {
              if (owner === '' || owner === null) return null;
              return (
                <rect
                  key={`box-${r}-${c}`}
                  x={PADDING + c * CELL + 2}
                  y={PADDING + r * CELL + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={4}
                  fill={COLOR[owner as 'X' | 'O']}
                  opacity={0.35}
                />
              );
            }),
          )}

          {/* 點 */}
          {Array.from({ length: BOX_ROWS + 1 }, (_, r) =>
            Array.from({ length: BOX_COLS + 1 }, (_, c) => (
              <circle
                key={`dot-${r}-${c}`}
                cx={PADDING + c * CELL}
                cy={PADDING + r * CELL}
                r={3.5}
                className="fill-slate-500 dark:fill-slate-300"
              />
            )),
          )}

          {/* 水平邊 */}
          {Array.from({ length: BOX_ROWS + 1 }, (_, r) =>
            Array.from({ length: BOX_COLS }, (_, c) => {
              const owner = hEdges[r]?.[c] ?? '';
              if (owner === '' || owner === null) return null;
              const isLast = lastEdgeType === 'h' && lastMove?.row === r && lastMove?.col === c;
              return (
                <line
                  key={`h-${r}-${c}`}
                  x1={PADDING + c * CELL}
                  y1={PADDING + r * CELL}
                  x2={PADDING + (c + 1) * CELL}
                  y2={PADDING + r * CELL}
                  stroke={COLOR[owner as 'X' | 'O']}
                  strokeWidth={isLast ? 5 : 4}
                  strokeLinecap="round"
                />
              );
            }),
          )}

          {/* 垂直邊 */}
          {Array.from({ length: BOX_ROWS }, (_, r) =>
            Array.from({ length: BOX_COLS + 1 }, (_, c) => {
              const owner = vEdges[r]?.[c] ?? '';
              if (owner === '' || owner === null) return null;
              const isLast = lastEdgeType === 'v' && lastMove?.row === r && lastMove?.col === c;
              return (
                <line
                  key={`v-${r}-${c}`}
                  x1={PADDING + c * CELL}
                  y1={PADDING + r * CELL}
                  x2={PADDING + c * CELL}
                  y2={PADDING + (r + 1) * CELL}
                  stroke={COLOR[owner as 'X' | 'O']}
                  strokeWidth={isLast ? 5 : 4}
                  strokeLinecap="round"
                />
              );
            }),
          )}
        </svg>
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
          <span className="font-mono">
            {lastEdgeType === 'h' ? 'H' : 'V'}({lastMove.row},{lastMove.col})
          </span>
        </div>
      )}
    </div>
  );
}
