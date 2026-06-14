import { useEffect, useState, useRef, useMemo } from 'react';
import type { GameComponentProps } from '../../core/types/game';
import { reversiEngine, hasValidMove } from './engine';
import {
  ensureGameState,
  submitMove,
  passTurn,
  subscribeGameState,
} from './sync';
import { BOARD_SIZE, type ReversiState } from './types';

export default function Reversi({
  roomId,
  currentUserId,
  players,
  isHost,
  onGameFinished,
}: GameComponentProps) {
  const [state, setState] = useState<ReversiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintMode, setHintMode] = useState(false);
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
    if (!state || finishedReportedRef.current) return;
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
  const isMyTurn = state !== null && mySymbol === state.currentTurn;
  const playerCanMove = useMemo(() => {
    if (!state || !mySymbol) return false;
    return hasValidMove(state, mySymbol);
  }, [state, mySymbol]);

  const handleCellClick = async (row: number, col: number) => {
    if (!state || !currentPlayer || !isMyTurn) return;
    setError(null);
    const res = await submitMove(roomId, currentUserId, currentPlayer.symbol, { row, col });
    if (!res.applied) {
      setError(res.reason ?? '落子失敗');
    }
  };

  const handlePass = async () => {
    if (!state || !currentPlayer || !isMyTurn) return;
    setError(null);
    const res = await passTurn(roomId, currentUserId, currentPlayer.symbol);
    if (!res.applied) {
      setError(res.reason ?? 'Pass 失敗');
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div>
          {isMyTurn ? (
            <p className="text-lg font-semibold text-green-400">
              輪到你（{mySymbol}）
              {!playerCanMove && (
                <span className="ml-2 text-sm text-yellow-400">（無合法步，需 Pass）</span>
              )}
            </p>
          ) : (
            <p className="text-lg text-slate-400">
              等待對方（{state.currentTurn}）落子
              {state.passCount > 0 && (
                <span className="ml-2 text-sm text-yellow-400">
                  （已連續 Pass {state.passCount} 次）
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 rounded bg-slate-900/50 px-2 py-1">
            <span className="h-3 w-3 rounded-full bg-black ring-1 ring-slate-600"></span>
            <span className="text-slate-300">{xCount}</span>
          </div>
          <span className="text-slate-500">vs</span>
          <div className="flex items-center gap-1 rounded bg-slate-900/50 px-2 py-1">
            <span className="h-3 w-3 rounded-full bg-white ring-1 ring-slate-600"></span>
            <span className="text-slate-300">{oCount}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {isMyTurn && (
            <button
              onClick={() => setHintMode((h) => !h)}
              className={`rounded px-3 py-1 text-xs ${
                hintMode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {hintMode ? '隱藏提示' : '顯示提示'}
            </button>
          )}
          {isMyTurn && !playerCanMove && (
            <button
              onClick={handlePass}
              className="rounded bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-500"
            >
              Pass（讓對方下）
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-700 bg-emerald-900/30 p-4">
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
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(row, col)}
                disabled={!canClick}
                className={`relative border border-emerald-900/40 ${
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
                {showHint && cell === '' && (
                  <span className="absolute inset-3 rounded-full border-2 border-dashed border-green-400 opacity-60" />
                )}
                {isLastMove && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
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
