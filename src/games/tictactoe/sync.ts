import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { tictactoeEngine } from './engine';
import { createInitialState, isValidState, type TicTacToeState } from './types';
import { incrementUndoQuota, updateTurn } from '../../core/services/roomService';
import { clearUndoRequest } from '../../core/services/undoService';
import type { GameMove, MoveRecord } from '../../core/types/game';

const statePath = (roomId: string) => `rooms-live/${roomId}/state`;

export async function ensureGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, (current) => {
    if (current) return current;
    return createInitialState();
  });
}

export async function submitMove(
  roomId: string,
  playerId: string,
  playerSymbol: string,
  displayName: string,
  payload: { row: number; col: number }
): Promise<{ applied: boolean; reason?: string }> {
  const stateRef = ref(rtdb, statePath(roomId));

  let result: { applied: boolean; reason?: string } = { applied: false };

  await runTransaction(stateRef, (current) => {
    if (!current) {
      result = { applied: false, reason: '遊戲尚未初始化' };
      return;
    }

    if (!isValidState(current)) {
      result = { applied: false, reason: '遊戲狀態損壞' };
      return;
    }

    const state = current as TicTacToeState;

    if (state.nextSymbol !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }

    const move: GameMove = { playerId, payload, timestamp: Date.now() };

    if (!tictactoeEngine.validateMove(state, move)) {
      result = { applied: false, reason: '無效的移動' };
      return;
    }

    const newState = tictactoeEngine.applyMove(state, move);
    const timestamp = Date.now();
    const moveRecord: MoveRecord = {
      row: payload.row,
      col: payload.col,
      symbol: playerSymbol,
      uid: playerId,
      displayName,
      timestamp,
      boardAfter: newState.board as ReadonlyArray<string>,
    };
    result = { applied: true };
    return { ...newState, moves: [...(state.moves ?? []), moveRecord] };
  });

  if (result.applied) {
    const nextSymbol = playerSymbol === 'X' ? 'O' : 'X';
    await updateTurn(roomId, nextSymbol);
  }

  return result;
}

export function subscribeGameState(
  roomId: string,
  callback: (state: TicTacToeState | null) => void
): Unsubscribe {
  const stateRef = ref(rtdb, statePath(roomId));
  return onValue(stateRef, (snap) => {
    const value = snap.val();
    if (!value) {
      callback(null);
      return;
    }
    if (!isValidState(value)) {
      console.warn('RTDB returned invalid game state, ignoring', value);
      callback(null);
      return;
    }
    callback(value);
  });
}

export async function resetGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, () => createInitialState());
}

/**
 * IMPROVEMENTS #12 悔棋：同意對方的悔棋請求
 * - 退回 state 到 moves 倒數第二步（即移除最後一步）
 * - 重新 apply 前面所有步以保證 board 完全正確
 * - 換成被悔的玩家（requester）的回合
 * - 增加 requester 的悔棋額度
 * - 清空 RTDB undoRequest
 *
 * 邊界：
 * - 沒有 moves → 失敗
 * - 最後一步不是 requester 下的 → 失敗（理論上 UI 不會讓你按）
 * - 已是 gameOver 狀態（已呼叫 finishGame）→ 仍允許（讓悔棋能挽救快贏的局面）
 */
export async function acceptUndo(
  roomId: string,
  requesterUid: string,
): Promise<{ applied: boolean; reason?: string; newTurnSymbol?: string }> {
  const stateRef = ref(rtdb, statePath(roomId));

  let result: { applied: boolean; reason?: string; newTurnSymbol?: string } = { applied: false };

  await runTransaction(stateRef, (current) => {
    if (!current) {
      result = { applied: false, reason: '遊戲尚未初始化' };
      return;
    }
    if (!isValidState(current)) {
      result = { applied: false, reason: '遊戲狀態損壞' };
      return;
    }
    const state = current as TicTacToeState;
    if (!state.moves || state.moves.length === 0) {
      result = { applied: false, reason: '沒有可以悔的步' };
      return;
    }
    const removed = state.moves[state.moves.length - 1];
    if (removed.uid !== requesterUid) {
      result = { applied: false, reason: '這步不是你下的，無法悔棋' };
      return;
    }

    // 重新套用 moves[0..length-2]
    let newState: TicTacToeState = createInitialState();
    for (let i = 0; i < state.moves.length - 1; i++) {
      const m = state.moves[i];
      newState = tictactoeEngine.applyMove(newState, {
        playerId: m.uid,
        payload: { row: m.row, col: m.col },
        timestamp: m.timestamp,
      }) as TicTacToeState;
    }

    // 移除最後一步、輪到 requester
    const finalState: TicTacToeState = {
      ...newState,
      moves: state.moves.slice(0, -1),
      nextSymbol: removed.symbol as 'X' | 'O',
    };
    result = { applied: true, newTurnSymbol: finalState.nextSymbol };
    return finalState;
  });

  if (result.applied) {
    try {
      await incrementUndoQuota(roomId, requesterUid);
    } catch (err) {
      console.warn('incrementUndoQuota 失敗（悔棋仍生效）', err);
    }
    try {
      await clearUndoRequest(roomId);
    } catch (err) {
      console.warn('clearUndoRequest 失敗', err);
    }
    if (result.newTurnSymbol) {
      await updateTurn(roomId, result.newTurnSymbol);
    }
  }

  return result;
}
