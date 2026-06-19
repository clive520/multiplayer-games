import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameComponentProps } from '../../core/types/game';
import { mancalaEngine } from './engine';
import {
  ensureGameState,
  submitMove,
  subscribeGameState,
} from './sync';
import { formatMancalaSymbol } from './symbols';
import { GameHeader, type GameHeaderStatus } from '../../core/components/GameHeader';
import { useToast } from '../../core/components/Toast';
import { PITS_PER_SIDE, type MancalaState, type Side } from './types';

const PIT_DIAMETER = 56;
const STORE_WIDTH = 72;
const STORE_HEIGHT = 180;
const PIT_GAP = 8;

export default function Mancala({
  roomId,
  currentUserId,
  players,
  isHost,
  isSpectator = false,
  turnSecondsLeft,
  turnTimeLimitSec,
  onGameFinished,
  onActivity,
}: GameComponentProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [state, setState] = useState<MancalaState | null>(null);
  const finishedReportedRef = useRef(false);

  useEffect(() => {
    finishedReportedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    ensureGameState(roomId).catch((err) => {
      console.error('初始化遊戲狀態失敗', err);
    });
    const unsubscribe = subscribeGameState(roomId, setState);
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    if (!state) return;
    onActivity?.();
  }, [state?.moveCount, onActivity]);

  useEffect(() => {
    if (!state || finishedReportedRef.current) return;
    const result = mancalaEngine.checkResult(state, players);
    if (result.finished) {
      finishedReportedRef.current = true;
      onGameFinished(result.winnerId ?? null, !!result.isDraw).catch((err) => {
        console.error('回報遊戲結果失敗', err);
      });
    }
  }, [state, players, onGameFinished]);

  const currentPlayer = players.find((p) => p.uid === currentUserId) ?? null;
  const mySymbol = currentPlayer?.symbol as 'X' | 'O' | undefined;
  const mySide: Side | undefined = mySymbol === 'X' ? 0 : mySymbol === 'O' ? 1 : undefined;
  const isMyTurn = !isSpectator && state !== null && mySymbol === state.currentTurn;

  const handlePitClick = useCallback(
    async (side: 0 | 1, pit: number) => {
      if (!state || !currentPlayer || !isMyTurn) return;
      if (side !== mySide) return; // 只能選自己一側
      const res = await submitMove(
        roomId,
        currentUserId,
        currentPlayer.symbol,
        currentPlayer.displayName,
        { side, pit },
      );
      if (!res.applied) {
        toast.error(res.reason ?? t('games.mancala.moveFailed'));
      }
    },
    [state, currentPlayer, isMyTurn, mySide, roomId, currentUserId, toast, t],
  );

  let headerStatus: GameHeaderStatus;
  if (!state) {
    headerStatus = { kind: 'spectating', symbol: 'X', gameType: 'mancala' };
  } else {
    const result = mancalaEngine.checkResult(state, players);
    if (result.finished) {
      headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'mancala' };
    } else if (isSpectator) {
      headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'mancala' };
    } else if (isMyTurn && mySymbol) {
      headerStatus = { kind: 'myTurn', symbol: mySymbol, gameType: 'mancala' };
    } else {
      headerStatus = { kind: 'opponentTurn', symbol: state.currentTurn, gameType: 'mancala' };
    }
  }

  if (!state) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 text-center">
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  // 視覺常量
  const ROW_WIDTH = PITS_PER_SIDE * PIT_DIAMETER + (PITS_PER_SIDE - 1) * PIT_GAP;
  const BOARD_WIDTH = ROW_WIDTH + 2 * STORE_WIDTH + 2 * 16; // store + 間距

  return (
    <div className="space-y-4">
      <GameHeader
        status={headerStatus}
        formatSymbol={formatMancalaSymbol}
        turnSecondsLeft={turnSecondsLeft}
        turnTimeLimitSec={turnTimeLimitSec}
        players={players}
        currentUserId={currentUserId}
      />

      {/* 分數顯示 */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-blue-500">{formatMancalaSymbol('X')}</span>
          <strong className="text-lg">{state.stores[0]}</strong>
        </span>
        <span className="text-slate-400">vs</span>
        <span className="flex items-center gap-2">
          <strong className="text-lg">{state.stores[1]}</strong>
          <span className="font-semibold text-rose-500">{formatMancalaSymbol('O')}</span>
        </span>
      </div>

      {/* 棋盤 */}
      <div className="flex justify-center">
        <div
          className="rounded-xl border-2 border-amber-900/30 dark:border-amber-700/30 bg-amber-100/40 dark:bg-amber-900/20 p-3"
          style={{ width: BOARD_WIDTH }}
        >
          <div className="flex items-center gap-2">
            {/* 左邊 store（X 的，0 側） */}
            <Store
              value={state.stores[0]}
              isCurrentTurn={state.currentTurn === 'X'}
              label={formatMancalaSymbol('X')}
              colorClass="text-blue-500"
            />

            {/* 中央：兩排 pit */}
            <div className="flex-1 space-y-2">
              {/* 上排：O 側（玩家 1 視角看是下方） */}
              <PitRow
                side={1}
                stones={state.pits[1]}
                onClick={isMyTurn ? (p) => handlePitClick(1, p) : undefined}
                isMyRow={mySide === 1 && isMyTurn}
                currentPit={state.lastMove?.side === 1 ? state.lastMove.pit : -1}
              />
              {/* 下排：X 側（玩家 0 視角看是下方） */}
              <PitRow
                side={0}
                stones={state.pits[0]}
                onClick={isMyTurn ? (p) => handlePitClick(0, p) : undefined}
                isMyRow={mySide === 0 && isMyTurn}
                currentPit={state.lastMove?.side === 0 ? state.lastMove.pit : -1}
              />
            </div>

            {/* 右邊 store（O 的，1 側） */}
            <Store
              value={state.stores[1]}
              isCurrentTurn={state.currentTurn === 'O'}
              label={formatMancalaSymbol('O')}
              colorClass="text-rose-500"
            />
          </div>
        </div>
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          {t('games.mancala.playAgainHint')}
        </p>
      )}
    </div>
  );
}

interface PitRowProps {
  side: 0 | 1;
  stones: number[];
  onClick?: (pit: number) => void;
  isMyRow: boolean;
  currentPit: number;
}

function PitRow({ stones, onClick, isMyRow, currentPit }: PitRowProps) {
  return (
    <div className="flex gap-2">
      {stones.map((count, i) => (
        <Pit
          key={i}
          count={count}
          isClickable={isMyRow && count > 0}
          isHighlight={currentPit === i}
          onClick={onClick ? () => onClick(i) : undefined}
        />
      ))}
    </div>
  );
}

interface PitProps {
  count: number;
  isClickable: boolean;
  isHighlight: boolean;
  onClick?: () => void;
}

function Pit({ count, isClickable, isHighlight, onClick }: PitProps) {
  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-full transition ${
        isHighlight
          ? 'ring-4 ring-yellow-400 ring-offset-1 dark:ring-offset-slate-800 bg-amber-200 dark:bg-amber-800/40'
          : 'bg-amber-200/70 dark:bg-amber-900/40'
      } ${
        isClickable
          ? 'cursor-pointer hover:bg-amber-300 hover:dark:bg-amber-800/60 hover:scale-105'
          : 'cursor-not-allowed'
      }`}
      style={{ width: PIT_DIAMETER, height: PIT_DIAMETER }}
      aria-label={`${count} 顆石頭`}
    >
      {/* 石頭視覺化（最多顯示 12 顆，太多顯示 +N） */}
      {count > 0 && count <= 12 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-amber-700 dark:bg-amber-300"
            />
          ))}
        </div>
      ) : count > 12 ? (
        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
          {count}
        </span>
      ) : null}
    </button>
  );
}

interface StoreProps {
  value: number;
  isCurrentTurn: boolean;
  label: string;
  colorClass: string;
}

function Store({ value, isCurrentTurn, label, colorClass }: StoreProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg ${
        isCurrentTurn
          ? 'bg-amber-300/60 dark:bg-amber-800/40 ring-2 ring-yellow-400'
          : 'bg-amber-200/60 dark:bg-amber-900/30'
      }`}
      style={{ width: STORE_WIDTH, height: STORE_HEIGHT }}
    >
      <span className={`text-xs font-semibold ${colorClass}`}>{label}</span>
      <span className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200">
        {value}
      </span>
    </div>
  );
}
