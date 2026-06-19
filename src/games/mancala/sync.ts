import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { mancalaEngine } from './engine';
import { isValidState, type MancalaState } from './types';
import { incrementUndoQuota, updateTurn } from '../../core/services/roomService';
import { clearUndoRequest } from '../../core/services/undoService';
import type { GameMove, MoveRecord } from '../../core/types/game';

const statePath = (roomId: string) => `rooms-live/${roomId}/state`;

export async function ensureGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, (current) => {
    // 沒 state 或 state 結構不對（其他遊戲殘留 / Firebase 序列化損壞）→ 重置
    if (current && isValidState(current)) return current;
    return mancalaEngine.getInitialState();
  });
}

export async function submitMove(
  roomId: string,
  playerId: string,
  playerSymbol: string,
  displayName: string,
  payload: { side: 0 | 1; pit: number },
): Promise<{ applied: boolean; reason?: string; nextSymbol?: string }> {
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
    const state = current as MancalaState;
    if (state.currentTurn !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }
    const move: GameMove = { playerId, payload, timestamp: Date.now() };
    if (!mancalaEngine.validateMove(state, move)) {
      result = { applied: false, reason: '此 pit 為空或選擇無效' };
      return;
    }
    const newState = mancalaEngine.applyMove(state, move);
    // 棋譜：boardAfter 為 [pits[0], pits[1], stores[0], stores[1]] = 14 元素
    // 序列化：數字轉字串（如 "0"~"12"），還原時 parseInt
    const boardFlat = [
      ...newState.pits[0].map(String),
      ...newState.pits[1].map(String),
      String(newState.stores[0]),
      String(newState.stores[1]),
    ];
    const moveRecord: MoveRecord = {
      // 播棋用 side/pit 當座標（沿用 row=side, col=pit）
      row: payload.side,
      col: payload.pit,
      symbol: playerSymbol,
      uid: playerId,
      displayName,
      timestamp: Date.now(),
      boardAfter: boardFlat,
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
  callback: (state: MancalaState | null) => void,
): Unsubscribe {
  const stateRef = ref(rtdb, statePath(roomId));
  return onValue(stateRef, (snap) => {
    const value = snap.val();
    if (!value) {
      callback(null);
      return;
    }
    if (!isValidState(value)) {
      console.warn('RTDB returned invalid mancala state, ignoring', value);
      callback(null);
      return;
    }
    callback(value);
  });
}

export async function resetGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, () => mancalaEngine.getInitialState());
}

/**
 * IMPROVEMENTS #12 悔棋：同意對方的悔棋請求
 * 播棋邏輯：重算 moves[0..N-2]
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
    const state = current as MancalaState;
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
    let newState: MancalaState = mancalaEngine.getInitialState();
    for (let i = 0; i < state.moves.length - 1; i++) {
      const m = state.moves[i];
      // 從 row (side) / col (pit) 還原 payload
      newState = mancalaEngine.applyMove(newState, {
        playerId: m.uid,
        payload: { side: m.row as 0 | 1, pit: m.col },
        timestamp: m.timestamp,
      }) as MancalaState;
    }

    const finalState: MancalaState = {
      ...newState,
      moves: state.moves.slice(0, -1),
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
