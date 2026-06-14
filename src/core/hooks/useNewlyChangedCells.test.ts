import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNewlyChangedCells } from './useNewlyChangedCells';

describe('useNewlyChangedCells', () => {
  it('初始渲染：回傳空集合', () => {
    const { result } = renderHook(() => useNewlyChangedCells(['X', 'O', '']));
    expect(result.current.size).toBe(0);
  });

  it('board 改變時回傳變動的索引', () => {
    const { result, rerender } = renderHook(
      ({ board }: { board: readonly string[] }) => useNewlyChangedCells(board),
      { initialProps: { board: ['', '', ''] } }
    );
    expect(result.current.size).toBe(0);

    // 第一格放 X、第二格放 O
    rerender({ board: ['X', 'O', ''] });
    expect(result.current.has(0)).toBe(true);
    expect(result.current.has(1)).toBe(true);
    expect(result.current.has(2)).toBe(false);
    expect(result.current.size).toBe(2);
  });

  it('翻面（Reversi 情境）：X 變 O 仍被偵測', () => {
    const { result, rerender } = renderHook(
      ({ board }: { board: readonly string[] }) => useNewlyChangedCells(board),
      { initialProps: { board: ['X', 'O', ''] } }
    );
    rerender({ board: ['O', 'O', ''] });
    expect(result.current.has(0)).toBe(true);
  });

  it('clearMs 後自動清除（透過 fake timer 模擬）', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ board }: { board: readonly string[] }) => useNewlyChangedCells(board, 350),
      { initialProps: { board: [''] } }
    );
    rerender({ board: ['X'] });
    expect(result.current.size).toBe(1);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.size).toBe(0);
    vi.useRealTimers();
  });

  it('board 從 undefined 切換到有效值不報錯', () => {
    // 守護 React rules-of-hooks：hook 必須接受 undefined 輸入，
    // 否則遊戲元件在 state 載入前會因為條件式呼叫 hook 而報錯（#310）
    const { result, rerender } = renderHook(
      ({ board }: { board: readonly string[] | undefined }) =>
        useNewlyChangedCells(board),
      { initialProps: { board: undefined as readonly string[] | undefined } }
    );
    expect(result.current.size).toBe(0);
    // 從 undefined 切換到初始狀態：不應觸發動畫（initial state 不算變動）
    rerender({ board: ['X', '', ''] as readonly string[] });
    expect(result.current.size).toBe(0);
    // 從初始狀態切換到下一手：應偵測變動
    rerender({ board: ['X', 'O', ''] as readonly string[] });
    expect(result.current.has(1)).toBe(true);
  });
});
