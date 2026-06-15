import { ref, set, onValue, off, remove } from 'firebase/database';
import { rtdb } from '../firebase/rtdb';

/**
 * 房間內悔棋請求（IMPROVEMENTS #12 悔棋請求 Phase A）
 *
 * 為什麼用 RTDB 獨立節點（不混進 game state）：
 * - 不影響主遊戲 state（避免 race condition）
 * - 訂閱 / 清理簡單
 * - 觀戰者也能看到（純資訊）
 *
 * 流程：
 * 1. 玩家 A 點「悔棋」按鈕 → requestUndo 寫入本節點
 * 2. 玩家 B 訂閱看到請求 → 彈窗同意/拒絕
 * 3. 同意 → 遊戲 sync 的 acceptUndo 退回 state（不同遊戲邏輯不同）
 * 4. 拒絕 / 超時 → clearUndoRequest 移除節點
 */

export interface UndoRequest {
  /** 發起悔棋的 UID */
  requesterUid: string;
  /** 發起者暱稱（快照，避免改名） */
  requesterNickname: string;
  /** 要悔的是第幾步（moves 的 index，從 0 開始） */
  targetMoveIndex: number;
  /** 發起時間（毫秒） */
  createdAt: number;
}

/** 悔棋請求超時（毫秒） */
export const UNDO_REQUEST_TIMEOUT_MS = 30_000;

const requestPath = (roomId: string) => `rooms-live/${roomId}/undoRequest`;
const dbRef = (roomId: string) => ref(rtdb, requestPath(roomId));

/** 送出悔棋請求 */
export async function requestUndo(
  roomId: string,
  args: { requesterUid: string; requesterNickname: string; targetMoveIndex: number },
): Promise<void> {
  await set(dbRef(roomId), {
    requesterUid: args.requesterUid,
    requesterNickname: args.requesterNickname,
    targetMoveIndex: args.targetMoveIndex,
    createdAt: Date.now(),
  });
}

/** 清空悔棋請求（拒絕 / 超時 / 取消時用） */
export async function clearUndoRequest(roomId: string): Promise<void> {
  await remove(dbRef(roomId));
}

/** 訂閱悔棋請求狀態；null = 沒有請求 */
export function subscribeUndoRequest(
  roomId: string,
  callback: (request: UndoRequest | null) => void,
): () => void {
  const nodeRef = dbRef(roomId);
  const handler = onValue(nodeRef, (snap) => {
    const val = snap.val() as UndoRequest | null;
    if (!val) {
      callback(null);
      return;
    }
    callback(val);
  });
  return () => {
    off(nodeRef, 'value', handler);
  };
}

/** 判斷悔棋請求是否已超時 */
export function isUndoRequestTimedOut(request: UndoRequest, now: number = Date.now()): boolean {
  return now - request.createdAt > UNDO_REQUEST_TIMEOUT_MS;
}
