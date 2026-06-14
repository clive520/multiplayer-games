import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { gomokuEngine } from './engine';
import { createInitialState, isValidState, type GomokuState } from './types';
import { updateTurn } from '../../core/services/roomService';
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
