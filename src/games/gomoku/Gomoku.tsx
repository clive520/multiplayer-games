import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameComponentProps } from '../../core/types/game';
import { gomokuEngine } from './engine';
import { ensureGameState, submitMove, subscribeGameState } from './sync';
import { formatGomokuSymbol } from './symbols';
import { GameHeader, type GameHeaderStatus } from '../../core/components/GameHeader';
import { BoardCell } from '../../core/components/BoardCell';
import { useNewlyChangedCells } from '../../core/hooks/useNewlyChangedCells';
import { BOARD_SIZE, type GomokuState } from './types';

export default function Gomoku({
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
  const [state, setState] = useState<GomokuState | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    if (!state || !Array.isArray(state.board) || finishedReportedRef.current) return;
    const result = gomokuEngine.checkResult(state, players);
    if (result.finished) {
      finishedReportedRef.current = true;
      onGameFinished(result.winnerId ?? null, !!result.isDraw).catch((err) => {
        console.error('回報遊戲結果失敗', err);
      });
    }
  }, [state, players, onGameFinished]);

  useEffect(() => {
    if (!state || !Array.isArray(state.board)) return;
    onActivity?.();
  }, [state?.moveCount, onActivity]);

  const currentPlayer = players.find((p) => p.uid === currentUserId) ?? null;
  const mySymbol = currentPlayer?.symbol;
  const isMyTurn = !isSpectator && state !== null && mySymbol === state.nextSymbol;
  const winnerSymbol = state?.lastMove && state.winnerLine ? state.lastMove.symbol : null;
  const winnerPlayer = winnerSymbol
    ? players.find((p) => p.symbol === winnerSymbol) ?? null
    : null;

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
      setError(res.reason ?? t('games.gomoku.moveFailed'));
    }
  };

  if (!state) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 text-center">
        <p className="dark:text-slate-400 text-slate-600">{t('games.gomoku.loading')}</p>
      </div>
    );
  }

  if (!Array.isArray(state.board) || state.board.length !== BOARD_SIZE * BOARD_SIZE) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-center text-sm text-red-300">
        {t('games.gomoku.stateCorrupted')}
      </div>
    );
  }

  // 建立 winnerLine 集合方便 O(1) 查詢
  const winnerLineSet = new Set<string>();
  if (state.winnerLine) {
    for (const p of state.winnerLine) {
      winnerLineSet.add(`${p.row},${p.col}`);
    }
  }

  // 計算 header 狀態
  let headerStatus: GameHeaderStatus;
  if (winnerPlayer) {
    headerStatus = { kind: 'won', winnerName: winnerPlayer.displayName };
  } else if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) {
    headerStatus = { kind: 'draw' };
  } else if (isSpectator) {
    headerStatus = { kind: 'spectating', symbol: state.nextSymbol, gameType: 'gomoku' };
  } else if (isMyTurn && mySymbol) {
    headerStatus = { kind: 'myTurn', symbol: mySymbol, gameType: 'gomoku' };
  } else {
    headerStatus = { kind: 'opponentTurn', symbol: state.nextSymbol, gameType: 'gomoku' };
  }

  return (
    <div className="space-y-4">
      <GameHeader
        status={headerStatus}
        formatSymbol={formatGomokuSymbol}
        turnSecondsLeft={turnSecondsLeft}
        turnTimeLimitSec={turnTimeLimitSec}
        players={players}
        currentUserId={currentUserId}
      />

      {error && (
        <div className="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-amber-900/30 bg-amber-50 p-4">
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
            const isLastMove = !!(
              state.lastMove &&
              state.lastMove.row === row &&
              state.lastMove.col === col
            );
            const isInWinLine = winnerLineSet.has(`${row},${col}`);
            const isEmpty = cell === '';
            const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
            const showPreview = isHovered && isMyTurn && isEmpty && mySymbol;
            return (
              <BoardCell
                key={idx}
                onClick={() => handleCellClick(row, col)}
                onMouseEnter={() => setHoveredCell({ row, col })}
                onMouseLeave={() =>
                  setHoveredCell((h) => (h?.row === row && h?.col === col ? null : h))
                }
                disabled={!isMyTurn || !isEmpty}
                isLastMove={isLastMove}
                lastMovePulse={isLastMove}
                lastMovePosition="outer"
                isNewlyPlaced={newlyChangedCells.has(idx)}
                className={`border border-amber-900/30 ${
                  isInWinLine ? 'bg-yellow-300' : 'hover:bg-amber-100'
                } ${!isMyTurn || !isEmpty ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {cell === 'X' && (
                  <span className="absolute inset-1 rounded-full bg-black shadow-md" />
                )}
                {cell === 'O' && (
                  <span className="absolute inset-1 rounded-full bg-white shadow-md ring-2 ring-black" />
                )}
                {/* 滑鼠 hover 預覽棋子（半透明）*/}
                {showPreview && mySymbol === 'X' && (
                  <span className="pointer-events-none absolute inset-1 rounded-full bg-black opacity-40" />
                )}
                {showPreview && mySymbol === 'O' && (
                  <span className="pointer-events-none absolute inset-1 rounded-full bg-white opacity-40 ring-1 ring-black" />
                )}
              </BoardCell>
            );
          })}
        </div>
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          {t('games.gomoku.playAgainHint')}
        </p>
      )}
    </div>
  );
}
