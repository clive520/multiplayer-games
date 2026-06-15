import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameComponentProps } from '../../core/types/game';
import { tictactoeEngine } from './engine';
import { ensureGameState, submitMove, subscribeGameState } from './sync';
import { GameHeader, type GameHeaderStatus } from '../../core/components/GameHeader';
import { BoardCell } from '../../core/components/BoardCell';
import { useNewlyChangedCells } from '../../core/hooks/useNewlyChangedCells';
import { BOARD_SIZE, type TicTacToeState } from './types';

export default function TicTacToe({
  roomId,
  currentUserId,
  players,
  isHost,
  turnSecondsLeft,
  turnTimeLimitSec,
  onGameFinished,
  isSpectator = false,
  onActivity,
}: GameComponentProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<TicTacToeState | null>(null);
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
    if (!state || !Array.isArray(state.board)) return;
    // 每次狀態變化（moveCount 增加）通知 GameRoom 有活動
    onActivity?.();
  }, [state?.moveCount, onActivity]);

  useEffect(() => {
    if (!state || !Array.isArray(state.board) || finishedReportedRef.current) return;
    const result = tictactoeEngine.checkResult(state, players);
    if (result.finished) {
      finishedReportedRef.current = true;
      onGameFinished(result.winnerId ?? null, !!result.isDraw).catch((err) => {
        console.error('回報遊戲結果失敗', err);
      });
    }
  }, [state, players, onGameFinished]);

  const currentPlayer = players.find((p) => p.uid === currentUserId) ?? null;
  const mySymbol = currentPlayer?.symbol;
  const isMyTurn = !isSpectator && state !== null && mySymbol === state.nextSymbol;
  const winnerSymbol = state ? findWinnerSymbol(state) : null;
  const winnerPlayer = winnerSymbol
    ? players.find((p) => p.symbol === winnerSymbol) ?? null
    : null;

  // 偵測剛變動的格子（IMPROVEMENTS #5）— 必須在 early return 之前呼叫
  // 規則：hook 每次渲染都必須按相同順序呼叫，不能放在條件式 return 後
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
      setError(res.reason ?? t('games.tictactoe.moveFailed'));
    }
  };

  if (!state) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white p-6 text-center">
        <p className="dark:text-slate-400 text-slate-600">{t('games.tictactoe.loading')}</p>
      </div>
    );
  }

  if (!Array.isArray(state.board) || state.board.length !== BOARD_SIZE * BOARD_SIZE) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-center text-sm text-red-300">
        {t('games.tictactoe.stateCorrupted')}
      </div>
    );
  }

  // 計算 header 狀態
  let headerStatus: GameHeaderStatus;
  if (winnerPlayer) {
    headerStatus = { kind: 'won', winnerName: winnerPlayer.displayName };
  } else if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) {
    headerStatus = { kind: 'draw' };
  } else if (isSpectator) {
    headerStatus = { kind: 'spectating', symbol: state.nextSymbol, gameType: 'tictactoe' };
  } else if (isMyTurn && mySymbol) {
    headerStatus = { kind: 'myTurn', symbol: mySymbol, gameType: 'tictactoe' };
  } else {
    headerStatus = { kind: 'opponentTurn', symbol: state.nextSymbol, gameType: 'tictactoe' };
  }

  return (
    <div className="space-y-4">
      <GameHeader
        status={headerStatus}
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

      <div className="grid grid-cols-3 gap-2 rounded-lg border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white p-4">
        {state.board.map((cell, idx) => {
          const row = Math.floor(idx / BOARD_SIZE);
          const col = idx % BOARD_SIZE;
          const isLastMove = !!(
            state.lastMove &&
            state.lastMove.row === row &&
            state.lastMove.col === col
          );
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
              isLastMove={isLastMove && cell !== ''}
              lastMovePulse={isLastMove && cell !== ''}
              isNewlyPlaced={newlyChangedCells.has(idx)}
              className={`rounded-lg ${
                isLastMove
                  ? 'bg-yellow-900/40 ring-2 ring-yellow-500'
                  : 'dark:bg-slate-900 bg-slate-50'
              } ${
                isMyTurn && isEmpty
                  ? 'hover:dark:bg-slate-700 bg-slate-200 cursor-pointer'
                  : 'cursor-not-allowed'
              }`}
            >
              {cell === 'X' && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold leading-none text-blue-400">×</span>
              )}
              {cell === 'O' && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold leading-none text-red-400">○</span>
              )}
              {/* 滑鼠 hover 預覽（半透明）*/}
              {showPreview && mySymbol === 'X' && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold leading-none text-blue-400 opacity-40">×</span>
              )}
              {showPreview && mySymbol === 'O' && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold leading-none text-red-400 opacity-40">○</span>
              )}
            </BoardCell>
          );
        })}
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          {t('games.tictactoe.playAgainHint')}
        </p>
      )}
    </div>
  );
}

function findWinnerSymbol(state: TicTacToeState): string | null {
  if (!state || !Array.isArray(state.board) || state.board.length < 9) {
    return null;
  }
  const lines: ReadonlyArray<ReadonlyArray<number>> = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    const sym = state.board[a];
    if (sym && state.board[b] === sym && state.board[c] === sym) {
      return sym;
    }
  }
  return null;
}
