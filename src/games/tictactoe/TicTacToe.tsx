import { useEffect, useState, useRef } from 'react';
import type { GameComponentProps } from '../../core/types/game';
import { tictactoeEngine } from './engine';
import { ensureGameState, submitMove, subscribeGameState } from './sync';
import { TurnCountdown } from '../../core/components/TurnCountdown';
import { BOARD_SIZE, type TicTacToeState } from './types';

export default function TicTacToe({
  roomId,
  currentUserId,
  players,
  isHost,
  isSpectator = false,
  turnSecondsLeft,
  onGameFinished,
  onActivity,
}: GameComponentProps) {
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

  const handleCellClick = async (row: number, col: number) => {
    if (!state || !currentPlayer || !isMyTurn) return;
    setError(null);
    const res = await submitMove(roomId, currentUserId, currentPlayer.symbol, { row, col });
    if (!res.applied) {
      setError(res.reason ?? '移動失敗');
    }
  };

  if (!state) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-center">
        <p className="text-slate-400">遊戲載入中...</p>
      </div>
    );
  }

  if (!Array.isArray(state.board) || state.board.length !== BOARD_SIZE * BOARD_SIZE) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-center text-sm text-red-300">
        遊戲狀態損壞，請重新整理或重置房間
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div>
          {winnerPlayer ? (
            <p className="text-lg font-semibold text-yellow-400">
              {winnerPlayer.displayName} 獲勝！
            </p>
          ) : state.moveCount >= BOARD_SIZE * BOARD_SIZE ? (
            <p className="text-lg font-semibold text-slate-300">平手！</p>
          ) : isSpectator ? (
            <p className="text-lg text-slate-400">
              觀戰中（{state.nextSymbol} 下）
              <TurnCountdown secondsLeft={turnSecondsLeft} />
            </p>
          ) : isMyTurn ? (
            <p className="text-lg font-semibold text-green-400">
              輪到你（{mySymbol}）
              <TurnCountdown secondsLeft={turnSecondsLeft} />
            </p>
          ) : (
            <p className="text-lg text-slate-400">
              等待對方下棋（{state.nextSymbol}）
              <TurnCountdown secondsLeft={turnSecondsLeft} />
            </p>
          )}
        </div>
        <div className="flex gap-3 text-sm">
          {players.map((p) => (
            <div
              key={p.uid}
              className={`rounded px-2 py-1 ${
                p.uid === currentUserId
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {p.symbol}: {p.displayName}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-700 bg-slate-800 p-4">
        {state.board.map((cell, idx) => {
          const row = Math.floor(idx / BOARD_SIZE);
          const col = idx % BOARD_SIZE;
          const isLastMove =
            state.lastMove &&
            state.lastMove.row === row &&
            state.lastMove.col === col;
          const isEmpty = cell === '';
          const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
          const showPreview = isHovered && isMyTurn && isEmpty && mySymbol;
          return (
            <button
              key={idx}
              onClick={() => handleCellClick(row, col)}
              onMouseEnter={() => setHoveredCell({ row, col })}
              onMouseLeave={() =>
                setHoveredCell((h) => (h?.row === row && h?.col === col ? null : h))
              }
              disabled={!isMyTurn || !isEmpty}
              className={`relative aspect-square rounded-lg transition ${
                isLastMove
                  ? 'bg-yellow-900/40 ring-2 ring-yellow-500'
                  : 'bg-slate-900'
              } ${
                isMyTurn && isEmpty
                  ? 'hover:bg-slate-700 cursor-pointer'
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
              {/* 最後落子標記 */}
              {isLastMove && cell !== '' && (
                <span className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          房主可在房間頁面按「再來一局」重置棋盤
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
