import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameComponentProps } from '../../core/types/game';
import { dotsAndBoxesEngine } from './engine';
import {
  ensureGameState,
  submitMove,
  subscribeGameState,
} from './sync';
import { formatDotsAndBoxesSymbol } from './symbols';
import { GameHeader, type GameHeaderStatus } from '../../core/components/GameHeader';
import { useToast } from '../../core/components/Toast';
import {
  BOX_ROWS,
  BOX_COLS,
  type DotsAndBoxesState,
  type EdgeDirection,
} from './types';

const SIZE = 360; // 棋盤總邊長 (px)
const PADDING = 20;
const CELL = (SIZE - 2 * PADDING) / BOX_COLS; // 每格寬度 (水平方向)

const COLOR: Record<'X' | 'O', string> = {
  X: '#2563eb', // 藍
  O: '#e11d48', // 紅
};

type EdgePos = { type: EdgeDirection; row: number; col: number };

/** 計算某條邊的中點（SVG 座標） */
function edgeMidpoint(e: EdgePos): { x: number; y: number } {
  if (e.type === 'h') {
    // 水平邊 hEdges[e.row][e.col] 連接 (e.row, e.col) 和 (e.row, e.col+1)
    return {
      x: PADDING + (e.col + 0.5) * CELL,
      y: PADDING + e.row * CELL,
    };
  }
  // 垂直邊 vEdges[e.row][e.col] 連接 (e.row, e.col) 和 (e.row+1, e.col)
  return {
    x: PADDING + e.col * CELL,
    y: PADDING + (e.row + 0.5) * CELL,
  };
}

export default function DotsAndBoxes({
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
  const [state, setState] = useState<DotsAndBoxesState | null>(null);
  const [hovered, setHovered] = useState<EdgePos | null>(null);
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
    const result = dotsAndBoxesEngine.checkResult(state, players);
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

  const handleEdgeClick = useCallback(
    async (e: EdgePos) => {
      if (!state || !currentPlayer || !isMyTurn) return;
      const res = await submitMove(
        roomId,
        currentUserId,
        currentPlayer.symbol,
        currentPlayer.displayName,
        e,
      );
      if (!res.applied) {
        toast.error(res.reason ?? t('games.dotsandboxes.moveFailed'));
      }
    },
    [state, currentPlayer, isMyTurn, roomId, currentUserId, toast, t],
  );

  let headerStatus: GameHeaderStatus;
  if (!state) {
    headerStatus = { kind: 'spectating', symbol: 'X', gameType: 'dotsandboxes' };
  } else {
    const isFinished = state.boxOwners.every((row) => row.every((c) => c !== ''));
    if (isFinished) {
      headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'dotsandboxes' };
    } else if (isSpectator) {
      headerStatus = { kind: 'spectating', symbol: state.currentTurn, gameType: 'dotsandboxes' };
    } else if (isMyTurn && mySymbol) {
      headerStatus = { kind: 'myTurn', symbol: mySymbol, gameType: 'dotsandboxes' };
    } else {
      headerStatus = { kind: 'opponentTurn', symbol: state.currentTurn, gameType: 'dotsandboxes' };
    }
  }

  if (!state) {
    return (
      <div className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card p-6 text-center">
        <p className="dark:text-slate-400 text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GameHeader
        status={headerStatus}
        formatSymbol={formatDotsAndBoxesSymbol}
        turnSecondsLeft={turnSecondsLeft}
        turnTimeLimitSec={turnTimeLimitSec}
        players={players}
        currentUserId={currentUserId}
      />

      {/* 分數顯示 */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: COLOR.X }} />
          <span>
            {formatDotsAndBoxesSymbol('X')}: <strong>{state.scores.X}</strong>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: COLOR.O }} />
          <span>
            {formatDotsAndBoxesSymbol('O')}: <strong>{state.scores.O}</strong>
          </span>
        </span>
      </div>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card"
          style={{ width: '100%', maxWidth: SIZE }}
          role="img"
          aria-label="Dots and Boxes board"
        >
          {/* 1. 方格所有權背景（先畫在最底層） */}
          {state.boxOwners.map((row, r) =>
            row.map((owner, c) => {
              if (owner === '') return null;
              return (
                <rect
                  key={`box-${r}-${c}`}
                  x={PADDING + c * CELL + 2}
                  y={PADDING + r * CELL + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={4}
                  fill={owner === 'X' ? COLOR.X : COLOR.O}
                  opacity={0.35}
                />
              );
            }),
          )}

          {/* 2. 點（5×5 = 25 個） */}
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

          {/* 3. 邊的「點擊熱區」+ 已畫邊的線 */}
          {/* 水平邊 */}
          {Array.from({ length: BOX_ROWS + 1 }, (_, r) =>
            Array.from({ length: BOX_COLS }, (_, c) => {
              const e: EdgePos = { type: 'h', row: r, col: c };
              const owner = state.hEdges[r][c];
              const isLast = state.lastMove?.type === 'h' && state.lastMove.row === r && state.lastMove.col === c;
              const isHover = hovered?.type === 'h' && hovered.row === r && hovered.col === c;
              return (
                <g key={`h-${r}-${c}`}>
                  {owner !== '' ? (
                    <line
                      x1={PADDING + c * CELL}
                      y1={PADDING + r * CELL}
                      x2={PADDING + (c + 1) * CELL}
                      y2={PADDING + r * CELL}
                      stroke={COLOR[owner]}
                      strokeWidth={isLast ? 5 : 4}
                      strokeLinecap="round"
                    />
                  ) : null}
                  {/* 點擊熱區：寬 CELL × 高 16 的透明矩形 */}
                  {owner === '' && isMyTurn ? (
                    <rect
                      x={PADDING + c * CELL}
                      y={PADDING + r * CELL - 10}
                      width={CELL}
                      height={20}
                      fill={isHover ? (mySymbol === 'X' ? COLOR.X : COLOR.O) : 'transparent'}
                      fillOpacity={isHover ? 0.4 : 0}
                      className="cursor-pointer"
                      onClick={() => handleEdgeClick(e)}
                      onMouseEnter={() => setHovered(e)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  ) : null}
                </g>
              );
            }),
          )}

          {/* 垂直邊 */}
          {Array.from({ length: BOX_ROWS }, (_, r) =>
            Array.from({ length: BOX_COLS + 1 }, (_, c) => {
              const e: EdgePos = { type: 'v', row: r, col: c };
              const owner = state.vEdges[r][c];
              const isLast = state.lastMove?.type === 'v' && state.lastMove.row === r && state.lastMove.col === c;
              const isHover = hovered?.type === 'v' && hovered.row === r && hovered.col === c;
              return (
                <g key={`v-${r}-${c}`}>
                  {owner !== '' ? (
                    <line
                      x1={PADDING + c * CELL}
                      y1={PADDING + r * CELL}
                      x2={PADDING + c * CELL}
                      y2={PADDING + (r + 1) * CELL}
                      stroke={COLOR[owner]}
                      strokeWidth={isLast ? 5 : 4}
                      strokeLinecap="round"
                    />
                  ) : null}
                  {owner === '' && isMyTurn ? (
                    <rect
                      x={PADDING + c * CELL - 10}
                      y={PADDING + r * CELL}
                      width={20}
                      height={CELL}
                      fill={isHover ? (mySymbol === 'X' ? COLOR.X : COLOR.O) : 'transparent'}
                      fillOpacity={isHover ? 0.4 : 0}
                      className="cursor-pointer"
                      onClick={() => handleEdgeClick(e)}
                      onMouseEnter={() => setHovered(e)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  ) : null}
                </g>
              );
            }),
          )}
        </svg>
      </div>

      {isHost && (
        <p className="text-center text-xs text-slate-500">
          {t('games.dotsandboxes.playAgainHint')}
        </p>
      )}
    </div>
  );
}

// 保留 edgeMidpoint export 供未來測試使用
export { edgeMidpoint };
