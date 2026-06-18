import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameComponentProps } from '../../core/types/game';
import { connect4Engine } from './engine';
import {
  ensureGameState,
  submitMove,
  subscribeGameState,
} from './sync';
import { formatConnect4Symbol } from './symbols';
import { GameHeader, type GameHeaderStatus } from '../../core/components/GameHeader';
import { useToast } from '../../core/components/Toast';
import { useNewlyChangedCells } from '../../core/hooks/useNewlyChangedCells';
import { COLS, ROWS, findDropRow, type Connect4State } from './types';

export default function Connect4({
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
  const [state, setState] = useState<Connect4State | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
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
    const result = connect4Engine.checkResult(state, players);
    if (result.finished) {
      finishedReportedRef.current = true;
      onGameFinished(result.winnerId ?? null, !!result.isDraw).catch((err) => {
        console.error('回報遊戲結果失敗', err);
      });
    }
  }, [state, players, onGameFinished]);

  const currentPlayer = players.find((p) => p.uid === currentUserId) ?? null;
  const mySymbol = currentPlayer?.symbol as 'X' | 'O' | undefined;
  const isMyTurn =
    !isSpectator && state !== null && mySymbol === state.currentTurn;

  const newlyChangedCells = useNewlyChangedCells(state?.board);

  const handleColClick = useCallback(
    async (col: number) => {
      if (!state || !currentPlayer || !isMyTurn) return;
      const dropRow = findDropRow(state.board, col);
      if (dropRow === -1) return;
      const res = await submitMove(roomId, currentUserId, currentPlayer.symbol, currentPlayer.displayName, {
        col,
      });
      if (!res.applied) {
        toast.error(res.reason ?? t('games.connect4.moveFailed'));
      }
    },
    [state, currentPlayer, isMyTurn, roomId, currentUserId, toast, t]
  );

  let headerStatus: GameHeaderStatus;
  if (!state) {
    headerStatus = { kind: 'spectating', symbol: 'X', gameType: 'connect4' };
  } else {
    const isFinished = state.winnerLine !== null;
    if (isFinished) {
      headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'connect4' };
    } else if (isSpectator) {
      headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'connect4' };
    } else if (isMyTurn && mySymbol) {
      headerStatus = { kind: 'myTurn', symbol: mySymbol, gameType: 'connect4' };
    } else {
      headerStatus = { kind: 'opponentTurn', symbol: state.currentTurn, gameType: 'connect4' };
    }
  }

  if (!state) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 text-center">
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  const hoverDropRow = hoveredCol !== null ? findDropRow(state.board, hoveredCol) : -1;
  const winnerKeySet = new Set<string>();
  if (state.winnerLine) {
    for (const { row, col } of state.winnerLine) {
      winnerKeySet.add(`${row},${col}`);
    }
  }
  const lastMoveKey = state.lastMove ? `${state.lastMove.row},${state.lastMove.col}` : null;

  return (
    <div className="space-y-4">
      <GameHeader
        status={headerStatus}
        formatSymbol={formatConnect4Symbol}
        turnSecondsLeft={turnSecondsLeft}
        turnTimeLimitSec={turnTimeLimitSec}
        players={players}
        currentUserId={currentUserId}
      />

      {/* 棋盤外框：包含「點擊欄」與「格子」 */}
      <div className="rounded-lg border border-amber-900/30 bg-amber-50 p-4">
        {/* 頂部：點擊欄（透明 overlay + 下箭頭提示） */}
        <div
          className="mb-1 grid w-full gap-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: COLS }, (_, col) => {
            const isColFull = findDropRow(state.board, col) === -1;
            const canClick = isMyTurn && !isColFull;
            const isHovered = hoveredCol === col;
            return (
              <button
                key={`col-header-${col}`}
                type="button"
                disabled={!canClick}
                onClick={() => handleColClick(col)}
                onMouseEnter={() => setHoveredCol(col)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`relative h-10 rounded-t transition ${
                  canClick
                    ? 'cursor-pointer hover:bg-amber-200/60'
                    : 'cursor-not-allowed opacity-40'
                } ${isHovered && canClick ? 'bg-amber-200/80' : ''}`}
                aria-label={`第 ${col + 1} 欄`}
                title={canClick ? t('games.connect4.dropHere') : (isColFull ? t('games.connect4.colFull') : '')}
              >
                {/* 永久下箭頭（提示用） */}
                {canClick && (
                  <svg
                    aria-hidden
                    className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-amber-700"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 16l-6-6h12l-6 6z" />
                  </svg>
                )}
                {/* 欄滿了顯示鎖 */}
                {isColFull && (
                  <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ⊘
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 棋盤本身：COLS x ROWS */}
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            aspectRatio: `${COLS} / ${ROWS}`,
          }}
          aria-label="Connect 4 board"
        >
          {state.board.map((cell, idx) => {
            const row = Math.floor(idx / COLS);
            const col = idx % COLS;
            const isLastMove = lastMoveKey === `${row},${col}`;
            const isWinner = winnerKeySet.has(`${row},${col}`);
            const isHoverPreview =
              hoveredCol === col && row === hoverDropRow && isMyTurn && cell === '' && mySymbol;
            const isNewlyPlaced = newlyChangedCells.has(idx);
            return (
              <div
                key={idx}
                className="relative border border-amber-900/20 bg-amber-100/50"
                onMouseEnter={() => setHoveredCol(col)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {/* 棋子（含落下動畫） */}
                {cell === 'X' && (
                  <span
                    className={`absolute inset-1 rounded-full bg-red-500 shadow-md ${
                      isNewlyPlaced ? 'animate-piece-drop' : ''
                    }`}
                  />
                )}
                {cell === 'O' && (
                  <span
                    className={`absolute inset-1 rounded-full bg-yellow-400 shadow-md ring-2 ring-amber-700 ${
                      isNewlyPlaced ? 'animate-piece-drop' : ''
                    }`}
                  />
                )}
                {/* 滑鼠 hover 預覽（半透明，會在落子動畫前顯示） */}
                {isHoverPreview && mySymbol === 'X' && (
                  <span className="pointer-events-none absolute inset-1 rounded-full bg-red-500 opacity-30" />
                )}
                {isHoverPreview && mySymbol === 'O' && (
                  <span className="pointer-events-none absolute inset-1 rounded-full bg-yellow-400 opacity-30 ring-2 ring-amber-700" />
                )}
                {/* 最後一手指示 */}
                {isLastMove && !isWinner && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-pulse-ring rounded"
                  />
                )}
                {/* 獲勝線高亮 */}
                {isWinner && (
                  <span
                    aria-hidden
                    className="absolute inset-1 rounded-full ring-4 ring-yellow-300"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          {t('games.connect4.playAgainHint')}
        </p>
      )}
    </div>
  );
}
