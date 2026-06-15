import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameComponentProps } from '../../core/types/game';
import { reversiEngine, hasValidMove } from './engine';
import {
  ensureGameState,
  submitMove,
  passTurn,
  subscribeGameState,
} from './sync';
import { formatReversiSymbol } from './symbols';
import { GameHeader, type GameHeaderStatus } from '../../core/components/GameHeader';
import { BoardCell } from '../../core/components/BoardCell';
import { useNewlyChangedCells } from '../../core/hooks/useNewlyChangedCells';
import { BOARD_SIZE, type ReversiState } from './types';

export default function Reversi({
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
  const [state, setState] = useState<ReversiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintMode, setHintMode] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
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
    if (!state || !Array.isArray(state.board)) return;
    onActivity?.();
  }, [state?.moveCount, onActivity]);

  useEffect(() => {
    if (!state || !Array.isArray(state.board) || finishedReportedRef.current) return;
    const result = reversiEngine.checkResult(state, players);
    if (result.finished) {
      finishedReportedRef.current = true;
      onGameFinished(result.winnerId ?? null, !!result.isDraw).catch((err) => {
        console.error('回報遊戲結果失敗', err);
      });
    }
  }, [state, players, onGameFinished]);

  const currentPlayer = players.find((p) => p.uid === currentUserId) ?? null;
  const mySymbol = currentPlayer?.symbol as 'X' | 'O' | undefined;
  const isMyTurn = !isSpectator && state !== null && mySymbol === state.currentTurn;
  const playerCanMove = useMemo(() => {
    if (!state || !mySymbol || isSpectator) return false;
    return hasValidMove(state, mySymbol);
  }, [state, mySymbol, isSpectator]);

  // 偵測剛變動的格子（IMPROVEMENTS #5）— 必須在 early return 之前呼叫
  const newlyChangedCells = useNewlyChangedCells(state?.board);

  const handleCellClick = async (row: number, col: number) => {
    if (!state || !currentPlayer || !isMyTurn) return;
    setError(null);
    const res = await submitMove(
      roomId,
      currentUserId,
      currentPlayer.symbol,
      currentPlayer.displayName,
      { row, col }
    );
    if (!res.applied) {
      setError(res.reason ?? t('games.reversi.moveFailed'));
    }
  };

  const handlePass = async () => {
    if (!state || !currentPlayer || !isMyTurn) return;
    setError(null);
    const res = await passTurn(roomId, currentUserId, currentPlayer.symbol);
    if (!res.applied) {
      setError(res.reason ?? t('games.reversi.passFailed'));
    }
  };

  if (!state) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 text-center">
        <p className="dark:text-slate-400 text-slate-600">{t('games.reversi.loading')}</p>
      </div>
    );
  }

  if (!Array.isArray(state.board) || state.board.length !== BOARD_SIZE * BOARD_SIZE) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-center text-sm text-red-300">
        {t('games.reversi.stateCorrupted')}
      </div>
    );
  }

  // 計算雙方棋子數（顯示在 UI）
  let xCount = 0;
  let oCount = 0;
  for (const cell of state.board) {
    if (cell === 'X') xCount++;
    else if (cell === 'O') oCount++;
  }

  // 提示模式下計算合法步位置
  const hintSet = new Set<string>();
  if (hintMode && isMyTurn && mySymbol) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (
          reversiEngine.validateMove(state, {
            playerId: currentUserId,
            payload: { row: r, col: c },
            timestamp: 0,
          })
        ) {
          hintSet.add(`${r},${c}`);
        }
      }
    }
  }

  // 上一步翻的棋子集合
  const lastFlipsSet = new Set<string>();
  for (const { row, col } of state.lastFlips ?? []) {
    lastFlipsSet.add(`${row},${col}`);
  }
  const lastMoveKey = state.lastMove ? `${state.lastMove.row},${state.lastMove.col}` : null;

  // 計算 header 狀態
  let headerStatus: GameHeaderStatus;
  const isFinished =
    state.passCount >= 2 ||
    state.board.filter((c) => c !== '').length >= BOARD_SIZE * BOARD_SIZE;
  if (isFinished) {
    // 簡化：因為 finished 時由 GameRoom 顯示 ResultScreen，這裡只處理未完狀態
    headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'reversi' };
  } else if (isSpectator) {
    headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'reversi' };
  } else if (isMyTurn && mySymbol) {
    headerStatus = { kind: 'myTurn', symbol: mySymbol, gameType: 'reversi' };
  } else {
    headerStatus = { kind: 'opponentTurn', symbol: state.currentTurn, gameType: 'reversi' };
  }

  // 附加提示：觀戰者看到連續 Pass、輪到自己但無合法步
  const extraHint = (() => {
    if (state.passCount > 0 && isSpectator) {
      return (
        <span className="ml-2 text-sm text-yellow-400">
          {t('games.reversi.passCount', { count: state.passCount })}
        </span>
      );
    }
    if (isMyTurn && !playerCanMove) {
      return (
        <span className="ml-2 text-sm text-yellow-400">{t('games.reversi.noValidMove')}</span>
      );
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      <GameHeader
        status={headerStatus}
        formatSymbol={formatReversiSymbol}
        turnSecondsLeft={turnSecondsLeft}
        turnTimeLimitSec={turnTimeLimitSec}
        extraHint={extraHint}
        rightContent={
          <>
            <div className="flex items-center gap-1 rounded dark:bg-slate-900 bg-slate-50/50 px-2 py-1">
              <span className="h-3 w-3 rounded-full bg-black ring-1 ring-slate-600"></span>
              <span className="dark:text-slate-300 text-slate-700">{xCount}</span>
            </div>
            <span className="text-slate-500">vs</span>
            <div className="flex items-center gap-1 rounded dark:bg-slate-900 bg-slate-50/50 px-2 py-1">
              <span className="h-3 w-3 rounded-full bg-white ring-1 ring-slate-600"></span>
              <span className="dark:text-slate-300 text-slate-700">{oCount}</span>
            </div>
            <div className="flex gap-2">
              {isMyTurn && (
                <button
                  onClick={() => setHintMode((h) => !h)}
                  className={`rounded px-3 py-1 text-xs ${
                    hintMode
                      ? 'bg-blue-600 dark:text-white text-slate-900'
                      : 'dark:bg-slate-700 bg-app-hover dark:text-slate-300 text-slate-700 hover:dark:bg-slate-600 bg-app-border-strong'
                  }`}
                >
                  {hintMode ? t('games.reversi.hideHints') : t('games.reversi.showHints')}
                </button>
              )}
              {isMyTurn && !playerCanMove && (
                <button
                  onClick={handlePass}
                  className="rounded bg-yellow-600 px-3 py-1 text-xs font-medium dark:text-white text-slate-900 hover:bg-yellow-500"
                >
                  {t('games.reversi.pass')}
                </button>
              )}
            </div>
          </>
        }
      />

      {error && (
        <div className="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-emerald-900/40 bg-emerald-900/30 p-4">
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            aspectRatio: '1 / 1',
          }}
        >
          {state.board.map((cell, idx) => {
            const row = Math.floor(idx / BOARD_SIZE);
            const col = idx % BOARD_SIZE;
            const isLastMove = lastMoveKey === `${row},${col}`;
            const isFlipped = lastFlipsSet.has(`${row},${col}`);
            const showHint = hintSet.has(`${row},${col}`);
            const canClick = isMyTurn && cell === '';
            const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
            const showPreview = isHovered && canClick && mySymbol;
            return (
              <BoardCell
                key={idx}
                onClick={() => handleCellClick(row, col)}
                onMouseEnter={() => setHoveredCell({ row, col })}
                onMouseLeave={() =>
                  setHoveredCell((h) => (h?.row === row && h?.col === col ? null : h))
                }
                disabled={!canClick}
                isLastMove={isLastMove}
                lastMovePulse={isLastMove}
                lastMovePosition="outer"
                isNewlyPlaced={newlyChangedCells.has(idx)}
                className={`border border-emerald-900/40 ${
                  canClick
                    ? 'cursor-pointer hover:bg-emerald-800/30'
                    : 'cursor-not-allowed'
                } ${isFlipped ? 'bg-yellow-700/40' : ''}`}
              >
                {cell === 'X' && (
                  <span className="absolute inset-2 rounded-full bg-black shadow-md" />
                )}
                {cell === 'O' && (
                  <span className="absolute inset-2 rounded-full bg-white shadow-md ring-1 ring-slate-500" />
                )}
                {/* 滑鼠 hover 預覽棋子（半透明）*/}
                {showPreview && mySymbol === 'X' && (
                  <span className="pointer-events-none absolute inset-2 rounded-full bg-black opacity-40 ring-1 ring-black/20" />
                )}
                {showPreview && mySymbol === 'O' && (
                  <span className="pointer-events-none absolute inset-2 rounded-full bg-white opacity-40 ring-1 ring-slate-500" />
                )}
                {showHint && cell === '' && (
                  <span className="pointer-events-none absolute inset-3 rounded-full border-2 border-dashed border-green-400 opacity-60" />
                )}
              </BoardCell>
            );
          })}
        </div>
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          {t('games.reversi.playAgainHint')}
        </p>
      )}
    </div>
  );
}
