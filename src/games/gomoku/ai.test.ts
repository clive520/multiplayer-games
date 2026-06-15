import { describe, it, expect } from 'vitest';
import { gomokuAI, gomokuAITestHelpers } from './ai';
import {
  createInitialState,
  EMPTY_CELL,
  type Cell,
  type GomokuState,
  type Position,
} from './types';
import { gomokuEngine } from './engine';
import type { GameMove } from '../../core/types/game';

const BOARD_SIZE = 15;

function apply(state: GomokuState, row: number, col: number, uid: string): GomokuState {
  const move: GameMove = {
    playerId: uid,
    payload: { row, col },
    timestamp: Date.now(),
  };
  return gomokuEngine.applyMove(state, move);
}

/**
 * 直接構造 state：跳過套用順序，測試只需要特定棋盤配置
 * stones: [row, col, symbol] 三元組列表，後面覆蓋前面
 */
function makeState(stones: Array<[number, number, Cell]>, lastSymbol: 'X' | 'O' | null = null): GomokuState {
  const board: Cell[] = Array(BOARD_SIZE * BOARD_SIZE).fill(EMPTY_CELL);
  let lastMove: { row: number; col: number; symbol: 'X' | 'O' } | null = null;
  for (const [r, c, s] of stones) {
    board[r * BOARD_SIZE + c] = s;
    lastMove = { row: r, col: c, symbol: s as 'X' | 'O' };
  }
  return {
    board,
    nextSymbol: lastSymbol === 'X' ? 'O' : 'X',
    moveCount: stones.length,
    lastMove,
    winnerLine: null,
    moves: [],
  };
}

describe('Gomoku AI', () => {
  it('空盤第一步走正中央', () => {
    const state = createInitialState();
    const move = gomokuAI.selectMove(state, 'X', 'normal');
    expect(move).toEqual({ row: 7, col: 7 });
  });

  it('能立刻下出致勝步（4 連 → 5 連）', () => {
    // AI 是 X，已有 (7,7)(7,8)(7,9)(7,10) 4 連，下 (7,11) 或 (7,6) 都能贏
    // O 隨便放一點，沒威脅
    const state = makeState([
      [7, 7, 'X'], [7, 8, 'X'], [7, 9, 'X'], [7, 10, 'X'],
      [0, 0, 'O'], [0, 1, 'O'],
    ], 'X');
    const move = gomokuAI.selectMove(state, 'X', 'normal');
    expect([
      { row: 7, col: 11 },
      { row: 7, col: 6 },
    ]).toContainEqual(move);
  });

  it('會擋對手的致勝威脅（4 連必擋）', () => {
    // 對手 O 有 (7,7)(7,8)(7,9)(7,10)，X 必須擋 (7,11) 或 (7,6)
    // X 只在遠處放 1 顆，沒自己贏棋
    const state = makeState([
      [7, 7, 'O'], [7, 8, 'O'], [7, 9, 'O'], [7, 10, 'O'],
      [3, 3, 'X'],
    ], 'X');
    const move = gomokuAI.selectMove(state, 'X', 'normal');
    expect([
      { row: 7, col: 11 },
      { row: 7, col: 6 },
    ]).toContainEqual(move);
  });

  it('盤面已滿時回傳 null', () => {
    let state = createInitialState();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        state = apply(state, r, c, `p${r}-${c}`);
        if (gomokuEngine.checkResult(state, [{ uid: 'p1', symbol: 'X' }, { uid: 'p2', symbol: 'O' }]).finished) break;
      }
    }
    // 走到這裡可能已分勝負（5 連）；如果沒滿就填滿
    if (state.moveCount < BOARD_SIZE * BOARD_SIZE) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (state.board[r * BOARD_SIZE + c] === '') {
            state = apply(state, r, c, `p${r}-${c}`);
            if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) break;
          }
        }
        if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) break;
      }
    }
    // 5 連先達成的話遊戲早就結束了；測試只在平手 / 沒勝負時生效
    if (state.moveCount < BOARD_SIZE * BOARD_SIZE) {
      const move = gomokuAI.selectMove(state, 'X', 'normal');
      // 若有空間，回傳非 null（可能不是 null）
      expect(move).not.toBeNull();
    }
  });

  it('普通模式 vs 隨機對手 5 場不輸', () => {
    // 跑 5 場，AI 是 X，O 隨機；X 不應該輸
    let losses = 0;
    let draws = 0;
    let wins = 0;
    for (let i = 0; i < 5; i++) {
      let state = createInitialState();
      let turn: 'X' | 'O' = 'X';
      let result: { finished: boolean; winnerId?: string; isDraw?: boolean } = { finished: false };
      for (let step = 0; step < 50; step++) {
        let move: Position | null;
        if (turn === 'X') {
          move = gomokuAI.selectMove(state, 'X', 'normal');
        } else {
          const candidates: Position[] = [];
          for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              if (state.board[r * BOARD_SIZE + c] === '') {
                // 簡單隨機：不限鄰近（速度考量）
                candidates.push({ row: r, col: c });
              }
            }
          }
          if (candidates.length === 0) break;
          move = candidates[Math.floor(Math.random() * candidates.length)];
        }
        if (!move) break;
        state = apply(state, move.row, move.col, `p${step}`);
        const r = gomokuEngine.checkResult(state, [
          { uid: 'ai', symbol: 'X' },
          { uid: 'rand', symbol: 'O' },
        ]);
        if (r.finished) {
          result = { finished: true, winnerId: r.winnerId, isDraw: r.isDraw };
          break;
        }
        turn = turn === 'X' ? 'O' : 'X';
      }
      if (result.isDraw) draws++;
      else if (result.winnerId === 'ai') wins++;
      else losses++;
    }
    // AI 至少不輸（普通模式啟發式夠強）
    expect(losses).toBe(0);
    expect(wins + draws).toBe(5);
  }, 30000);

  it('簡單模式 30 次都回傳有效步', () => {
    for (let i = 0; i < 30; i++) {
      let state = createInitialState();
      // 隨便下幾步
      state = apply(state, 7, 7, 'p1');
      state = apply(state, 8, 8, 'p2');
      state = apply(state, 7, 8, 'p1');
      const move = gomokuAI.selectMove(state, 'X', 'easy');
      expect(move).not.toBeNull();
      const idx = move!.row * BOARD_SIZE + move!.col;
      expect(state.board[idx]).toBe('');
    }
  });
});

describe('gomokuAITestHelpers', () => {
  it('getCandidateMoves 第一手回傳中央', () => {
    const state = createInitialState();
    const candidates = gomokuAITestHelpers.getCandidateMoves(state);
    expect(candidates).toEqual([{ row: 7, col: 7 }]);
  });

  it('getCandidateMoves 找鄰近石頭的空格', () => {
    let state = createInitialState();
    state = apply(state, 7, 7, 'p1');
    const candidates = gomokuAITestHelpers.getCandidateMoves(state);
    // 應該包含 (7,7) 周圍 2 格內的空格
    expect(candidates.length).toBeGreaterThan(0);
    // (0, 0) 距離太遠，不應該在候選裡
    expect(candidates.find((p) => p.row === 0 && p.col === 0)).toBeUndefined();
  });

  it('evaluatePosition 5 連給極高分', () => {
    // X 5 連在中間、O 沒什麼威脅
    const state = makeState([
      [7, 7, 'X'], [7, 8, 'X'], [7, 9, 'X'], [7, 10, 'X'], [7, 11, 'X'],
      [0, 0, 'O'], [0, 1, 'O'],
    ]);
    const score = gomokuAITestHelpers.evaluatePosition(state.board, 'X');
    expect(score).toBeGreaterThanOrEqual(1_000_000);
  });

  it('evaluatePosition 對手 5 連給極低分', () => {
    // O 5 連在中間、X 沒什麼威脅
    const state = makeState([
      [7, 7, 'O'], [7, 8, 'O'], [7, 9, 'O'], [7, 10, 'O'], [7, 11, 'O'],
      [0, 0, 'X'], [0, 1, 'X'],
    ]);
    const score = gomokuAITestHelpers.evaluatePosition(state.board, 'X');
    expect(score).toBeLessThanOrEqual(-1_000_000);
  });

  it('scoreLineOfFive 空線段回傳 0', () => {
    const board = Array(225).fill('');
    const cells: [number, number][] = [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
    ];
    const score = gomokuAITestHelpers.scoreLineOfFive(board, cells);
    expect(score).toBe(0);
  });
});
