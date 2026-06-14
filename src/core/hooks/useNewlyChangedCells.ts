import { useEffect, useRef, useState } from 'react';

/**
 * 比對目前 board 和前一次的 board，回傳剛變動的格子索引集合
 * 用於棋盤格動畫（IMPROVEMENTS #5）：新放的棋子或剛翻面的棋子加上 fade-in class
 *
 * @param board 棋盤陣列（Cell[]）
 * @param clearMs 動畫結束後多久清除標記（預設 350ms，對應 animate-cell-appear 280ms）
 * @returns Set<number> 剛變動的格子索引（游戲渲染時依此加 isNewlyPlaced class）
 */
export function useNewlyChangedCells<T extends string>(
  board: readonly T[] | undefined,
  clearMs = 350
): Set<number> {
  const prevBoardRef = useRef<readonly T[] | undefined>(board);
  const [newCells, setNewCells] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!board) return;
    const prev = prevBoardRef.current;
    // 第一次渲染：prev === board，無變化
    if (prev === board) return;

    const changed = new Set<number>();
    const len = Math.min(prev?.length ?? 0, board.length);
    for (let i = 0; i < len; i++) {
      if (board[i] !== prev?.[i]) {
        changed.add(i);
      }
    }
    // 若 board 長度變了（極少見），其餘也視為變化
    if (prev && prev.length !== board.length) {
      for (let i = len; i < board.length; i++) changed.add(i);
    }

    prevBoardRef.current = board;

    if (changed.size === 0) return;
    setNewCells(changed);
    const timer = window.setTimeout(() => setNewCells(new Set()), clearMs);
    return () => window.clearTimeout(timer);
  }, [board, clearMs]);

  return newCells;
}
