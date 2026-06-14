import { useEffect, useState, useRef } from 'react';
import type { GameComponentProps } from '../../core/types/game';
import { gomokuEngine } from './engine';
import { ensureGameState, submitMove, subscribeGameState } from './sync';
import { formatGomokuSymbol } from './symbols';
import { TurnCountdown } from '../../core/components/TurnCountdown';
import { BOARD_SIZE, type GomokuState } from './types';

export default function Gomoku({
  roomId,
  currentUserId,
  players,
  isHost,
  isSpectator = false,
  turnSecondsLeft,
  onGameFinished,
  onActivity,
}: GameComponentProps) {
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

  // 建立 winnerLine 集合方便 O(1) 查詢
  const winnerLineSet = new Set<string>();
  if (state.winnerLine) {
    for (const p of state.winnerLine) {
      winnerLineSet.add(`${p.row},${p.col}`);
    }
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
              觀戰中（{formatGomokuSymbol(state.nextSymbol)} 下）
              <TurnCountdown secondsLeft={turnSecondsLeft} />
            </p>
          ) : isMyTurn ? (
            <p className="text-lg font-semibold text-green-400">
              輪到你（{formatGomokuSymbol(mySymbol ?? '')}）
              <TurnCountdown secondsLeft={turnSecondsLeft} />
            </p>
          ) : (
            <p className="text-lg text-slate-400">
              等待對方落子（{formatGomokuSymbol(state.nextSymbol)}）
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

      <div className="rounded-lg border border-slate-700 bg-amber-50 p-4">
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
            const isLastMove =
              state.lastMove &&
              state.lastMove.row === row &&
              state.lastMove.col === col;
            const isInWinLine = winnerLineSet.has(`${row},${col}`);
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
                className={`relative border border-amber-900/30 ${
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
                {isLastMove && (
                  <span className="pointer-events-none absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          房主可在房間頁面按「再來一局」重置棋盤
        </p>
      )}
    </div>
  );
}
