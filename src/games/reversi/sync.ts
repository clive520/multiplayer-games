import { ref, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../../core/firebase/rtdb';
import { reversiEngine } from './engine';
import {
  createInitialState,
  isValidState,
  type ReversiState,
} from './types';
import { updateTurn } from '../../core/services/roomService';
import type { GameMove } from '../../core/types/game';

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
    result = { applied: true };
    return newState;
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
