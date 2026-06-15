import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { gomokuEngine } from './engine';
import { createInitialState, isValidState, type GomokuState } from './types';
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

    const state = current as GomokuState;

    if (state.nextSymbol !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }

    const move: GameMove = { playerId, payload, timestamp: Date.now() };

    if (!gomokuEngine.validateMove(state, move)) {
      result = { applied: false, reason: '無效的移動' };
      return;
    }

    const newState = gomokuEngine.applyMove(state, move);
    const timestamp = Date.now();
    const moveRecord: MoveRecord = {
      row: payload.row,
      col: payload.col,
      symbol: playerSymbol,
      uid: playerId,
      displayName,
      timestamp,
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
  callback: (state: GomokuState | null) => void
): Unsubscribe {
  const stateRef = ref(rtdb, statePath(roomId));
  return onValue(stateRef, (snap) => {
    const value = snap.val();
    if (!value) {
      callback(null);
      return;
    }
    if (!isValidState(value)) {
      console.warn('RTDB returned invalid gomoku state, ignoring', value);
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
 * IMPROVEMENTS #12 悔棋：同意對方的悔棋請求（與 tictactoe 邏輯相同）
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
    const state = current as GomokuState;
    if (!state.moves || state.moves.length === 0) {
      result = { applied: false, reason: '沒有可以悔的步' };
      return;
    }
    const removed = state.moves[state.moves.length - 1];
    if (removed.uid !== requesterUid) {
      result = { applied: false, reason: '這步不是你下的，無法悔棋' };
      return;
    }

    let newState: GomokuState = createInitialState();
    for (let i = 0; i < state.moves.length - 1; i++) {
      const m = state.moves[i];
      newState = gomokuEngine.applyMove(newState, {
        playerId: m.uid,
        payload: { row: m.row, col: m.col },
        timestamp: m.timestamp,
      }) as GomokuState;
    }

    const finalState: GomokuState = {
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
