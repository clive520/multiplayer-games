import type { AIEngine } from '../../core/types/ai';
import type { TicTacToeMove, TicTacToeState } from './types';
import { BOARD_SIZE, EMPTY_CELL, WIN_LINES } from './types';

const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

type Cell = 'X' | 'O' | '';

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getValidMoves(state: TicTacToeState): TicTacToeMove[] {
  const moves: TicTacToeMove[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r * BOARD_SIZE + c] === EMPTY_CELL) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

function checkWinner(board: Cell[]): Cell {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const sym = board[a];
    if (sym && board[b] === sym && board[c] === sym) {
      return sym;
    }
  }
  return '';
}

function isBoardFull(board: Cell[]): boolean {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (board[i] === EMPTY_CELL) return false;
  }
  return true;
}

/**
 * Minimax：遞迴列舉所有對局走步，回傳「假設雙方都下最佳」的局面分數
 * 井字棋盤太小，深度最多 9，不用 alpha-beta 也很瞬間
 *
 * 評分：
 * - AI 贏：+10 - depth（越快贏分越高）
 * - 對手贏：-10 + depth（越慢輸分越低，鼓勵拖延）
 * - 平手：0
 */
function minimax(
  board: Cell[],
  aiSymbol: 'X' | 'O',
  opponentSymbol: 'X' | 'O',
  isMaximizing: boolean,
  depth: number,
): number {
  const winner = checkWinner(board);
  if (winner === aiSymbol) return 10 - depth;
  if (winner === opponentSymbol) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const idx = r * BOARD_SIZE + c;
        if (board[idx] !== EMPTY_CELL) continue;
        board[idx] = aiSymbol;
        const score = minimax(board, aiSymbol, opponentSymbol, false, depth + 1);
        board[idx] = EMPTY_CELL;
        if (score > best) best = score;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const idx = r * BOARD_SIZE + c;
        if (board[idx] !== EMPTY_CELL) continue;
        board[idx] = opponentSymbol;
        const score = minimax(board, aiSymbol, opponentSymbol, true, depth + 1);
        board[idx] = EMPTY_CELL;
        if (score < best) best = score;
      }
    }
    return best;
  }
}

function pickBestMove(
  state: TicTacToeState,
  aiSymbol: 'X' | 'O',
  validMoves: TicTacToeMove[],
): TicTacToeMove | null {
  if (validMoves.length === 0) return null;
  const opponentSymbol: 'X' | 'O' = aiSymbol === 'X' ? 'O' : 'X';
  const board = [...state.board] as Cell[];

  let bestScore = -Infinity;
  let bestMove: TicTacToeMove | null = null;
  for (const move of validMoves) {
    const idx = move.row * BOARD_SIZE + move.col;
    board[idx] = aiSymbol;
    const score = minimax(board, aiSymbol, opponentSymbol, false, 0);
    board[idx] = EMPTY_CELL;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

export const tictactoeAI: AIEngine<TicTacToeState, TicTacToeMove> = {
  gameType: 'tictactoe',
  selectMove(state, aiSymbol, difficulty) {
    const validMoves = getValidMoves(state);
    if (validMoves.length === 0) return null;

    if (difficulty === 'easy') {
      // 60% 下最佳步、40% 隨機（讓簡單模式也會犯錯）
      if (Math.random() < 0.6) {
        return pickBestMove(state, aiSymbol, validMoves);
      }
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // 普通 / 困難：都跑完整 Minimax
    // （井字雙方完美 = 平手，所以這兩級實戰起來一樣；保留分級是為了介面一致）
    return pickBestMove(state, aiSymbol, validMoves);
  },
};

export const tictactoeAITestHelpers = {
  getValidMoves,
  pickBestMove,
  inBounds,
};
