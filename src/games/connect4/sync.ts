import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { connect4Engine } from './engine';
import { isValidState, type Connect4State, findDropRow } from './types';
import { incrementUndoQuota, updateTurn } from '../../core/services/roomService';
import { clearUndoRequest } from '../../core/services/undoService';
import type { GameMove, MoveRecord } from '../../core/types/game';

const statePath = (roomId: string) => `rooms-live/${roomId}/state`;

export async function ensureGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, (current) => {
    if (current) return current;
    return connect4Engine.getInitialState();
  });
}

export async function submitMove(
  roomId: string,
  playerId: string,
  playerSymbol: string,
  displayName: string,
  payload: { col: number }
): Promise<{ applied: boolean; reason?: string }> {
  const stateRef = ref(rtdb, statePath(roomId));

  let result: { applied: boolean; reason?: string; nextSymbol?: string } = { applied: false };

  await runTransaction(stateRef, (current) => {
    if (!current) {
      result = { applied: false, reason: '遊戲尚未初始化' };
      return;
    }
    if (!isValidState(current)) {
      result = { applied: false, reason: '遊戲狀態損壞' };
      return;
    }
    const state = current as Connect4State;
    if (state.currentTurn !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }
    const move: GameMove = { playerId, payload, timestamp: Date.now() };
    if (!connect4Engine.validateMove(state, move)) {
      result = { applied: false, reason: '此欄已滿或位置無效' };
      return;
    }
    const newState = connect4Engine.applyMove(state, move);
    const dropRow = findDropRow(state.board, payload.col);
    const timestamp = Date.now();
    const moveRecord: MoveRecord = {
      row: dropRow,
      col: payload.col,
      symbol: playerSymbol,
      uid: playerId,
      displayName,
      timestamp,
      boardAfter: newState.board as ReadonlyArray<string>,
    };
    result = { applied: true, nextSymbol: newState.currentTurn };
    return { ...newState, moves: [...(state.moves ?? []), moveRecord] };
  });

  if (result.applied && result.nextSymbol) {
    await updateTurn(roomId, result.nextSymbol);
  }

  return result;
}

export function subscribeGameState(
  roomId: string,
  callback: (state: Connect4State | null) => void
): Unsubscribe {
  const stateRef = ref(rtdb, statePath(roomId));
  return onValue(stateRef, (snap) => {
    const value = snap.val();
    if (!value) {
      callback(null);
      return;
    }
    if (!isValidState(value)) {
      console.warn('RTDB returned invalid connect4 state, ignoring', value);
      callback(null);
      return;
    }
    callback(value);
  });
}

export async function resetGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, () => connect4Engine.getInitialState());
}

/**
 * IMPROVEMENTS #12 悔棋：同意對方的悔棋請求
 * Connect 4 邏輯：
 * - 取出最後一步（記錄的 row, col 是落子後的實際位置）
 * - 移除最後一步 + 重新 apply moves[0..N-2]
 * - 設定 currentTurn 為 removed.symbol
 * - 增加 requester 的悔棋額度
 * - 清空 RTDB undoRequest
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
    const state = current as Connect4State;
    if (!state.moves || state.moves.length === 0) {
      result = { applied: false, reason: '沒有可以悔的步' };
      return;
    }
    const removed = state.moves[state.moves.length - 1];
    if (removed.uid !== requesterUid) {
      result = { applied: false, reason: '這步不是你下的，無法悔棋' };
      return;
    }

    // 重新套用 moves[0..N-2]
    let newState: Connect4State = connect4Engine.getInitialState();
    for (let i = 0; i < state.moves.length - 1; i++) {
      const m = state.moves[i];
      newState = connect4Engine.applyMove(newState, {
        playerId: m.uid,
        payload: { col: m.col },
        timestamp: m.timestamp,
      }) as Connect4State;
    }

    const finalState: Connect4State = {
      ...newState,
      moves: state.moves.slice(0, -1),
      currentTurn: removed.symbol as 'X' | 'O',
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
