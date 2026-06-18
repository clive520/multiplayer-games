import type { AIEngine } from '../../core/types/ai';
import { connect4Engine } from './engine';
import { COLS, ROWS, WIN_LENGTH, type Connect4State, type Cell } from './types';

/**
 * 四子棋 AI 引擎（IMPROVEMENTS #9 擴充）
 *
 * 難度分級：
 * - easy：完全隨機（不擋自己即將輸的棋）
 * - normal：1-ply 啟發式（檢查必贏/必擋 + 偏中心）
 * - hard：2-ply 啟發式（自己回合 + 對手回合都考慮）
 *
 * 注意：四子棋是公認比井字、五子棋難的遊戲。完整 minimax + alpha-beta
 * 可以做很強的 AI，但這裡用啟發式是 MVP 範圍。之後可升級。
 */

type Move = { col: number };

/** 取得所有可下的欄 */
function getValidCols(state: Connect4State): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (state.board[(ROWS - 1) * COLS + c] === '') cols.push(c);
  }
  return cols;
}

/** 從指定位置朝 4 個方向數同色棋數（用於啟發式評分） */
function countDir(
  board: Cell[],
  row: number,
  col: number,
  dr: number,
  dc: number,
  symbol: 'X' | 'O',
): number {
  let n = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === symbol) {
    n++;
    r += dr;
    c += dc;
  }
  return n;
}

/** 模擬在某 col 落子後的 board（不檢查贏） */
function simulateDrop(board: Cell[], col: number, symbol: 'X' | 'O'): { board: Cell[]; row: number } | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r * COLS + col] === '') {
      const nb = [...board];
      nb[r * COLS + col] = symbol;
      return { board: nb, row: r };
    }
  }
  return null;
}

/** 評分：對某個落子位置的「分數」（越高越好） */
function scoreMove(
  board: Cell[],
  col: number,
  symbol: 'X' | 'O',
  opponentSymbol: 'X' | 'O'
): number {
  const sim = simulateDrop(board, col, symbol);
  if (!sim) return -Infinity;

  const { board: nb, row } = sim;
  let score = 0;

  // 1. 偏中心（中央 col=3 最優，往兩邊遞減）
  score += 6 - Math.abs(3 - col) * 0.5;

  // 2. 自己形成連線（2 連=2 分，3 連=5 分）
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const count = 1 + countDir(nb, row, col, dr, dc, symbol) + countDir(nb, row, col, -dr, -dc, symbol);
    if (count >= WIN_LENGTH) score += 100; // 直接贏
    else if (count === 3) score += 5;
    else if (count === 2) score += 2;
  }

  // 3. 阻擋對手連線（對手 3 連 = 高優先阻擋）
  for (const [dr, dc] of directions) {
    // 模擬對手在此 col 落子（但因為 row 是固定的，檢查對手 4 連可能性）
    const oppCount = 1 + countDir(board, row, col, dr, dc, opponentSymbol) + countDir(board, row, col, -dr, -dc, opponentSymbol);
    if (oppCount >= WIN_LENGTH) score += 90; // 對手直接贏 → 必須擋
    else if (oppCount === 3) score += 10;
    else if (oppCount === 2) score += 2;
  }

  return score;
}

function pickBestByHeuristic(
  state: Connect4State,
  symbol: 'X' | 'O',
  lookAhead: 1 | 2
): Move | null {
  const valid = getValidCols(state);
  if (valid.length === 0) return null;
  const opp = symbol === 'X' ? 'O' : 'X';

  if (lookAhead === 1) {
    let best: Move = { col: valid[0] };
    let bestScore = -Infinity;
    for (const col of valid) {
      const s = scoreMove(state.board, col, symbol, opp);
      if (s > bestScore) {
        bestScore = s;
        best = { col };
      }
    }
    return best;
  }

  // 2-ply：自己這步 + 對手下一步的「最壞情況」分數（minimax 簡化）
  let best: Move = { col: valid[0] };
  let bestScore = -Infinity;
  for (const myCol of valid) {
    const mySim = simulateDrop(state.board, myCol, symbol);
    if (!mySim) continue;
    const myScore = scoreMove(state.board, myCol, symbol, opp);

    // 模擬對手下一步的最壞反擊
    const oppValidAfter = getValidCols({ ...state, board: mySim.board });
    let worstOppScore = Infinity;
    for (const oppCol of oppValidAfter) {
      const oppS = scoreMove(mySim.board, oppCol, opp, symbol);
      if (oppS < worstOppScore) worstOppScore = oppS;
    }
    // 總分 = 我方分數 - 對手最佳反擊
    const total = myScore - (worstOppScore === Infinity ? 0 : worstOppScore);
    if (total > bestScore) {
      bestScore = total;
      best = { col: myCol };
    }
  }
  return best;
}

export const connect4AI: AIEngine<Connect4State, Move> = {
  gameType: 'connect4',
  selectMove(state, symbol, difficulty) {
    const valid = getValidCols(state);
    if (valid.length === 0) return null;
    if (difficulty === 'easy') {
      // 隨機選（不擋輸）
      return { col: valid[Math.floor(Math.random() * valid.length)] };
    }
    if (difficulty === 'normal') {
      return pickBestByHeuristic(state, symbol, 1);
    }
    // hard
    return pickBestByHeuristic(state, symbol, 2);
  },
};

// 為了避免 lint 警告，保留對 engine 的引用（將來可能用於完整 minimax）
void connect4Engine;
