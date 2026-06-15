import { describe, it, expect } from 'vitest';
import { tictactoeAI, tictactoeAITestHelpers } from './ai';
import { createInitialState, type TicTacToeState } from './types';
import { tictactoeEngine } from './engine';
import type { GameMove } from '../../core/types/game';

function applyMoveToState(state: TicTacToeState, move: GameMove): TicTacToeState {
  return tictactoeEngine.applyMove(state, move);
}

function makeMove(
  state: TicTacToeState,
  uid: string,
  row: number,
  col: number,
): { state: TicTacToeState; move: GameMove } {
  const move: GameMove = {
    playerId: uid,
    payload: { row, col },
    timestamp: Date.now(),
  };
  return { state: applyMoveToState(state, move), move };
}

describe('TicTacToe AI', () => {
  it('在空盤上會選擇中央或角（最佳步）', () => {
    const state = createInitialState();
    const move = tictactoeAI.selectMove(state, 'X', 'normal');
    expect(move).not.toBeNull();
    // 第一步最佳：中央 (1,1) 或任一角
    expect([
      { row: 1, col: 1 },
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 2 },
    ]).toContainEqual(move);
  });

  it('能立刻下出致勝步', () => {
    // AI 是 X，前兩步下了 (0,0) 和 (0,1)，下一步下 (0,2) 贏
    let state = createInitialState();
    state = makeMove(state, 'p1', 0, 0).state;
    state = makeMove(state, 'p2', 1, 0).state;
    state = makeMove(state, 'p1', 0, 1).state;
    state = makeMove(state, 'p2', 1, 1).state;
    const move = tictactoeAI.selectMove(state, 'X', 'normal');
    expect(move).toEqual({ row: 0, col: 2 });
  });

  it('會擋對手的致勝威脅', () => {
    // AI 是 O，對手 X 已有 (0,0) (0,1)，下一步 X 下 (0,2) 贏
    // AI 必須擋 (0,2)
    let state = createInitialState();
    state = makeMove(state, 'p1', 0, 0).state;
    state = makeMove(state, 'p2', 1, 1).state;
    state = makeMove(state, 'p1', 0, 1).state;
    state = makeMove(state, 'p2', 2, 2).state;
    state = makeMove(state, 'p1', 1, 0).state;
    // 輪到 O 必須擋 (0,2)
    const move = tictactoeAI.selectMove(state, 'O', 'normal');
    expect(move).toEqual({ row: 0, col: 2 });
  });

  it('能正確處理「雙威脅」fork 局面並選擇正解', () => {
    // 經典 fork 設定：AI (X) 製造雙威脅
    // X 已有 (0,0) (2,2) 對角，下 (1,1) 製造兩條 open threats
    // 對手 O 無論擋哪邊，另一邊都會贏
    let state = createInitialState();
    state = makeMove(state, 'p1', 0, 0).state;
    state = makeMove(state, 'p2', 0, 1).state;
    state = makeMove(state, 'p1', 2, 2).state;
    state = makeMove(state, 'p2', 0, 2).state;
    // 輪到 X，下 (1,1) 形成雙威脅
    const move = tictactoeAI.selectMove(state, 'X', 'normal');
    expect(move).toEqual({ row: 1, col: 1 });
  });

  it('盤面已滿時回傳 null', () => {
    let state = createInitialState();
    // 填滿 9 格（X、O 輪流）
    const positions: [number, number][] = [
      [0, 0], [0, 1], [0, 2],
      [1, 1], [1, 0], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ];
    for (let i = 0; i < positions.length; i++) {
      const [r, c] = positions[i];
      state = makeMove(state, `p${i}`, r, c).state;
    }
    const move = tictactoeAI.selectMove(state, 'X', 'normal');
    expect(move).toBeNull();
  });

  it('完美 AI 對上完美 AI 一定平手（井字基本定理）', () => {
    let state = createInitialState();
    let turn: 'X' | 'O' = 'X';
    for (let i = 0; i < 9; i++) {
      const move = tictactoeAI.selectMove(state, turn, 'hard');
      expect(move).not.toBeNull();
      state = makeMove(state, `p${i}`, move!.row, move!.col).state;
      turn = turn === 'X' ? 'O' : 'X';
    }
    const result = tictactoeEngine.checkResult(state, [
      { uid: 'p1', symbol: 'X' },
      { uid: 'p2', symbol: 'O' },
    ]);
    expect(result.finished).toBe(true);
    expect(result.isDraw).toBe(true);
  });

  it('簡單模式 50 次都回傳有效步', () => {
    for (let i = 0; i < 50; i++) {
      let state = createInitialState();
      // 隨便下幾步製造一個非空盤
      state = makeMove(state, 'p1', 0, 0).state;
      state = makeMove(state, 'p2', 1, 1).state;
      const move = tictactoeAI.selectMove(state, 'X', 'easy');
      expect(move).not.toBeNull();
      const idx = move!.row * 3 + move!.col;
      expect(state.board[idx]).toBe('');
    }
  });

  it('普通模式會擋對手 win threat', () => {
    // 對手 X 已有 (0,0) (0,1)，AI (O) 必須擋 (0,2) 才不會輸
    let state = createInitialState();
    state = makeMove(state, 'p1', 0, 0).state;
    state = makeMove(state, 'p2', 1, 1).state;
    state = makeMove(state, 'p1', 0, 1).state;
    const move = tictactoeAI.selectMove(state, 'O', 'normal');
    expect(move).toEqual({ row: 0, col: 2 });
  });

  it('普通模式 3 次 vs 隨機對手都至少平手（AI 不會輸）', () => {
    // 跑 3 場驗證強度：AI 是 X，O 隨機下；X 至少平手（井字完美 AI 對隨機手絕不會輸）
    // 不用跑更多因為每場要 ~9 步 minimax，會超過 vitest 5s 預設 timeout
    let aiWins = 0;
    let draws = 0;
    let losses = 0;
    for (let i = 0; i < 3; i++) {
      let state = createInitialState();
      let turn: 'X' | 'O' = 'X';
      let result = { finished: false, isDraw: false, winnerId: undefined as string | undefined };
      for (let step = 0; step < 9; step++) {
        let move: { row: number; col: number } | null;
        if (turn === 'X') {
          move = tictactoeAI.selectMove(state, 'X', 'normal');
        } else {
          const validMoves: { row: number; col: number }[] = [];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              if (state.board[r * 3 + c] === '') validMoves.push({ row: r, col: c });
            }
          }
          move = validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        if (!move) break;
        state = makeMove(state, `p${step}`, move.row, move.col).state;
        const r = tictactoeEngine.checkResult(state, [
          { uid: 'ai', symbol: 'X' },
          { uid: 'rand', symbol: 'O' },
        ]);
        if (r.finished) {
          result = { finished: true, isDraw: !!r.isDraw, winnerId: r.winnerId };
          break;
        }
        turn = turn === 'X' ? 'O' : 'X';
      }
      if (result.isDraw) draws++;
      else if (result.winnerId === 'ai') aiWins++;
      else losses++;
    }
    expect(losses).toBe(0);
    expect(aiWins + draws).toBe(3);
  }, 10000);
});

describe('tictactoeAITestHelpers', () => {
  it('getValidMoves 列出所有空格', () => {
    let state = createInitialState();
    state = makeMove(state, 'p1', 0, 0).state;
    const moves = tictactoeAITestHelpers.getValidMoves(state);
    expect(moves).toHaveLength(8);
    expect(moves.find((m) => m.row === 0 && m.col === 0)).toBeUndefined();
  });
});
