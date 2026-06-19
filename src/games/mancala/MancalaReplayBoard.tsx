import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { MoveRecord } from '../../core/types/game';
import { PITS_PER_SIDE } from './types';

const PIT_DIAMETER = 48;
const PIT_GAP = 6;
const STORE_WIDTH = 60;
const STORE_HEIGHT = 160;

function parseBoardFlat(flat: ReadonlyArray<string>): {
  xPits: number[];
  oPits: number[];
  xStore: number;
  oStore: number;
} {
  if (flat.length < 14) {
    return {
      xPits: Array(PITS_PER_SIDE).fill(0),
      oPits: Array(PITS_PER_SIDE).fill(0),
      xStore: 0,
      oStore: 0,
    };
  }
  return {
    xPits: flat.slice(0, 6).map(Number),
    oPits: flat.slice(6, 12).map(Number),
    xStore: Number(flat[12] ?? '0'),
    oStore: Number(flat[13] ?? '0'),
  };
}

export interface MancalaReplayBoardProps {
  moves: ReadonlyArray<MoveRecord>;
}

export function MancalaReplayBoard({ moves }: MancalaReplayBoardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(moves.length);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<number | null>(null);

  useEffect(() => {
    setStep(moves.length);
    setPlaying(false);
  }, [moves]);

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
    }, 1200);
    return () => {
      if (playRef.current !== null) {
        window.clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [playing, step, moves.length]);

  const flat = step === 0
    ? Array(14).fill('4').map((v, i) => (i === 12 || i === 13 ? '0' : v))
    : (moves[step - 1]?.boardAfter ?? []);
  const { xPits, oPits, xStore, oStore } = parseBoardFlat(flat);

  const lastMove = step > 0 ? moves[step - 1] : null;
  const lastSide = lastMove?.row;
  const lastPit = lastMove?.col;

  const handlePrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const handleNext = useCallback(() => setStep((s) => Math.min(moves.length, s + 1)), [moves.length]);
  const handleTogglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      if (step >= moves.length) setStep(0);
      setPlaying(true);
    }
  }, [playing, step, moves.length]);

  if (moves.length > 0 && moves[0].boardAfter === undefined) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-4">
        <p className="text-center text-sm dark:text-slate-400 text-slate-600">
          {t('replay.dataMissing')}
        </p>
      </div>
    );
  }

  const ROW_WIDTH = PITS_PER_SIDE * PIT_DIAMETER + (PITS_PER_SIDE - 1) * PIT_GAP;
  const BOARD_WIDTH = ROW_WIDTH + 2 * STORE_WIDTH + 2 * 12;

  return (
    <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-3">
      <div className="flex justify-center">
        <div
          className="rounded-xl border-2 border-amber-900/30 dark:border-amber-700/30 bg-amber-100/40 dark:bg-amber-900/20 p-3"
          style={{ width: BOARD_WIDTH }}
        >
          <div className="flex items-center gap-2">
            <Store
              value={xStore}
              label="X"
              colorClass="text-blue-500"
            />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                {oPits.map((c, i) => (
                  <Pit
                    key={`o-${i}`}
                    count={c}
                    isHighlight={lastSide === 1 && lastPit === i}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {xPits.map((c, i) => (
                  <Pit
                    key={`x-${i}`}
                    count={c}
                    isHighlight={lastSide === 0 && lastPit === i}
                  />
                ))}
              </div>
            </div>
            <Store
              value={oStore}
              label="O"
              colorClass="text-rose-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handlePrev} disabled={step <= 0}
          className="rounded dark:bg-slate-700 bg-app-hover px-2 py-1 text-sm dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
          aria-label={t('replay.prev')}>◀</button>
        <button type="button" onClick={handleTogglePlay} disabled={moves.length === 0}
          className="rounded dark:bg-slate-700 bg-app-hover px-3 py-1 text-sm font-medium dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
          aria-label={playing ? t('replay.pause') : t('replay.play')}>
          {playing ? '⏸' : '▶'} {playing ? t('replay.pause') : t('replay.play')}
        </button>
        <button type="button" onClick={handleNext} disabled={step >= moves.length}
          className="rounded dark:bg-slate-700 bg-app-hover px-2 py-1 text-sm dark:text-white text-slate-900 hover:dark:bg-slate-600 bg-app-border-strong disabled:opacity-50"
          aria-label={t('replay.next')}>▶</button>
        <span className="text-sm dark:text-slate-300 text-slate-700">
          {t('replay.step', { current: step, total: moves.length })}
        </span>
      </div>

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

      {lastMove && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs dark:text-slate-400 text-slate-600">
          <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-blue-200">
            {t('replay.moveNumber', { n: step })}
          </span>
          <span className="font-medium dark:text-slate-200 text-slate-800">{lastMove.displayName}</span>
          <span>（{lastMove.symbol}）</span>
          <span className="font-mono">
            ({lastMove.row === 0 ? 'X' : 'O'},{lastMove.col})
          </span>
        </div>
      )}
    </div>
  );
}

function Pit({ count, isHighlight }: { count: number; isHighlight: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${
        isHighlight
          ? 'bg-amber-200 dark:bg-amber-800/40 ring-2 ring-yellow-400'
          : 'bg-amber-200/70 dark:bg-amber-900/40'
      }`}
      style={{ width: PIT_DIAMETER, height: PIT_DIAMETER }}
    >
      {count > 0 && count <= 12 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="block h-1.5 w-1.5 rounded-full bg-amber-700 dark:bg-amber-300" />
          ))}
        </div>
      ) : count > 12 ? (
        <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200">{count}</span>
      ) : null}
    </div>
  );
}

function Store({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg bg-amber-200/60 dark:bg-amber-900/30"
      style={{ width: STORE_WIDTH, height: STORE_HEIGHT }}
    >
      <span className={`text-[10px] font-semibold ${colorClass}`}>{label}</span>
      <span className="mt-0.5 text-base font-bold text-amber-900 dark:text-amber-200">{value}</span>
    </div>
  );
}
