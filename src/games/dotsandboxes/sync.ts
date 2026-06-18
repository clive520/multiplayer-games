import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { dotsAndBoxesEngine } from './engine';
import {
  isValidState,
  type DotsAndBoxesState,
  type EdgeDirection,
} from './types';
import { incrementUndoQuota, updateTurn } from '../../core/services/roomService';
import { clearUndoRequest } from '../../core/services/undoService';
import type { GameMove, MoveRecord } from '../../core/types/game';

const statePath = (roomId: string) => `rooms-live/${roomId}/state`;

export async function ensureGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, (current) => {
    // 沒 state 或 state 結構不對（其他遊戲殘留 / Firebase 序列化損壞）→ 重置
    if (current && isValidState(current)) return current;
    return dotsAndBoxesEngine.getInitialState();
  });
}

export async function submitMove(
  roomId: string,
  playerId: string,
  playerSymbol: string,
  displayName: string,
  payload: { type: EdgeDirection; row: number; col: number }
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
    const state = current as DotsAndBoxesState;
    if (state.currentTurn !== playerSymbol) {
      result = { applied: false, reason: '還沒輪到你' };
      return;
    }
    const move: GameMove = { playerId, payload, timestamp: Date.now() };
    if (!dotsAndBoxesEngine.validateMove(state, move)) {
      result = { applied: false, reason: '此邊已畫或位置無效' };
      return;
    }
    const newState = dotsAndBoxesEngine.applyMove(state, move);
    // 棋譜：boardAfter 用 2D 陣列序列化（用 JSON 轉成扁平 string[]）
    const boardFlat = [
      ...newState.hEdges.flat(),
      ...newState.vEdges.flat(),
      ...newState.boxOwners.flat(),
    ];
    const moveRecord: MoveRecord = {
      // 點點連連的 row/col 是邊的座標，不是落子位置
      row: payload.row,
      col: payload.col,
      symbol: playerSymbol,
      uid: playerId,
      displayName,
      timestamp: Date.now(),
      boardAfter: boardFlat as ReadonlyArray<string>,
      metadata: { type: payload.type },
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
  callback: (state: DotsAndBoxesState | null) => void
): Unsubscribe {
  const stateRef = ref(rtdb, statePath(roomId));
  return onValue(stateRef, (snap) => {
    const value = snap.val();
    if (!value) {
      callback(null);
      return;
    }
    if (!isValidState(value)) {
      console.warn('RTDB returned invalid dotsandboxes state, ignoring', value);
      callback(null);
      return;
    }
    callback(value);
  });
}

export async function resetGameState(roomId: string): Promise<void> {
  const stateRef = ref(rtdb, statePath(roomId));
  await runTransaction(stateRef, () => dotsAndBoxesEngine.getInitialState());
}

/**
 * IMPROVEMENTS #12 悔棋：同意對方的悔棋請求
 * 點點連連邏輯：
 * - 取出最後一步的 type/row/col
 * - 移除 boardAfter 對應位置的值，重算 scores
 * - 因為 applyMove 是純函數，可以直接重算最後一步之前的 state
 *
 * 簡化：重算整個 moves 序列（最多 40 步，不慢）
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
    const state = current as DotsAndBoxesState;
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
    let newState: DotsAndBoxesState = dotsAndBoxesEngine.getInitialState();
    for (let i = 0; i < state.moves.length - 1; i++) {
      const m = state.moves[i];
      // 從 metadata 還原 type，舊棋譜沒 metadata 就 fallback 用 'h'
      const type = (m.metadata?.type as EdgeDirection) ?? 'h';
      newState = dotsAndBoxesEngine.applyMove(newState, {
        playerId: m.uid,
        payload: { type, row: m.row, col: m.col },
        timestamp: m.timestamp,
      }) as DotsAndBoxesState;
    }

    const finalState: DotsAndBoxesState = {
      ...newState,
      moves: state.moves.slice(0, -1),
      // currentTurn 由 engine 在 applyMove 序列中自動切換（依最後一步有沒有得分決定是否同玩家）
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
