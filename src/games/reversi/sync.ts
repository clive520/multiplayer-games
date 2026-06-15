import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { reversiEngine } from './engine';
import {
  createInitialState,
  isValidState,
  type ReversiState,
} from './types';
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

    const state = current as ReversiState;

    if (state.currentTurn !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }

    const move: GameMove = { playerId, payload, timestamp: Date.now() };

    if (!reversiEngine.validateMove(state, move)) {
      result = { applied: false, reason: '此位置不能落子（沒有可翻的棋子）' };
      return;
    }

    const newState = reversiEngine.applyMove(state, move);
    const timestamp = Date.now();
    const moveRecord: MoveRecord = {
      row: payload.row,
      col: payload.col,
      symbol: playerSymbol,
      uid: playerId,
      displayName,
      timestamp,
      flipped: newState.lastFlips,
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

export async function passTurn(
  roomId: string,
  _playerId: string,
  playerSymbol: string
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

    const state = current as ReversiState;

    if (state.currentTurn !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }

    const opponent = playerSymbol === 'X' ? 'O' : 'X';
    const newState: ReversiState = {
      ...state,
      currentTurn: opponent,
      passCount: state.passCount + 1,
      lastMove: null,
      lastFlips: [],
    };
    result = { applied: true };
    return newState;
  });

  if (result.applied) {
    const nextSymbol = playerSymbol === 'X' ? 'O' : 'X';
    await updateTurn(roomId, nextSymbol);
  }

  return result;
}

export function subscribeGameState(
  roomId: string,
  callback: (state: ReversiState | null) => void
): Unsubscribe {
  const stateRef = ref(rtdb, statePath(roomId));
  return onValue(stateRef, (snap) => {
    const value = snap.val();
    if (!value) {
      callback(null);
      return;
    }
    if (!isValidState(value)) {
      console.warn('RTDB returned invalid reversi state, ignoring', value);
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
 * IMPROVEMENTS #12 悔棋：同意對方的悔棋請求（黑白棋特殊處理）
 *
 * 黑白棋每步會翻面多個棋子，所以「退回」要：
 * - 移除 moves 最後一步
 * - 重新 apply moves[0..N-2]（engine 自動處理翻面，不用手動還原）
 * - 把 currentTurn 設為被悔的玩家（removed.symbol）
 * - 重置 passCount = 0（避免連續 pass 計數卡住）
 * - 清除 lastMove / lastFlips（已重新計算）
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
    const state = current as ReversiState;
    if (!state.moves || state.moves.length === 0) {
      result = { applied: false, reason: '沒有可以悔的步' };
      return;
    }
    const removed = state.moves[state.moves.length - 1];
    if (removed.uid !== requesterUid) {
      result = { applied: false, reason: '這步不是你下的，無法悔棋' };
      return;
    }

    let newState: ReversiState = createInitialState();
    for (let i = 0; i < state.moves.length - 1; i++) {
      const m = state.moves[i];
      // 黑白棋要區分落子 vs pass（reversi 沒有 pass move record，pass 是 state 改變）
      if (m.row < 0) {
        // 理論上 moves 不會存 pass，但保險起見
        continue;
      }
      newState = reversiEngine.applyMove(newState, {
        playerId: m.uid,
        payload: { row: m.row, col: m.col },
        timestamp: m.timestamp,
      }) as ReversiState;
    }

    const finalState: ReversiState = {
      ...newState,
      moves: state.moves.slice(0, -1),
      currentTurn: removed.symbol as 'X' | 'O',
      passCount: 0,
    };
    result = { applied: true, newTurnSymbol: finalState.currentTurn };
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
