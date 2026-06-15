import { ref, push, set, query, limitToLast, onValue, off, remove } from 'firebase/database';
import { rtdb } from '../firebase/rtdb';

/**
 * 房間內聊天（IMPROVEMENTS #20）
 *
 * 儲存位置：RTDB `rooms-live/{roomId}/chat/{msgId}`
 * 為什麼用 RTDB 而非 Firestore：
 * - 即時性（跟 reactions 一樣，訂閱就能收到新訊息）
 * - 不需要複雜查詢（只按時間排序取最新）
 * - 短暫存在（房間結束或重置時一次性清掉）
 *
 * 結構：
 * - uid：發送者 UID
 * - nickname：發送時的暱稱（快照，避免改名後舊訊息錯亂）
 * - text：純文字，trim 後 1-200 字
 * - createdAt：本地時間戳（毫秒）
 */

export interface ChatMessage {
  id: string;
  uid: string;
  nickname: string;
  text: string;
  createdAt: number;
}

/** 單則訊息最大字數（trim 後） */
export const CHAT_MAX_LENGTH = 200;
/** 訂閱時最多取最近幾則（避免一次拉太多） */
export const CHAT_MAX_DISPLAY = 50;

/** 驗證聊天文字；不符合回傳失敗原因 */
export function validateChatText(text: unknown): { ok: true } | { ok: false; reason: 'empty' | 'tooLong' } {
  if (typeof text !== 'string') return { ok: false, reason: 'empty' };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  if (trimmed.length > CHAT_MAX_LENGTH) return { ok: false, reason: 'tooLong' };
  return { ok: true };
}

/** 送出聊天訊息（push 到 RTDB） */
export function sendChatMessage(
  roomId: string,
  args: { uid: string; nickname: string; text: string },
): Promise<void> {
  const validation = validateChatText(args.text);
  if (!validation.ok) {
    return Promise.reject(new Error(validation.reason));
  }
  const chatRef = ref(rtdb, `rooms-live/${roomId}/chat`);
  const newRef = push(chatRef);
  return set(newRef, {
    uid: args.uid,
    nickname: args.nickname,
    text: args.text.trim(),
    createdAt: Date.now(),
  }).then(() => undefined);
}

/** 訂閱最近 N 則聊天訊息（按 createdAt 升冪） */
export function subscribeChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void,
): () => void {
  const chatRef = query(
    ref(rtdb, `rooms-live/${roomId}/chat`),
    limitToLast(CHAT_MAX_DISPLAY),
  );
  const handler = onValue(chatRef, (snap) => {
    const val = snap.val() as Record<string, Omit<ChatMessage, 'id'>> | null;
    if (!val) {
      callback([]);
      return;
    }
    const list: ChatMessage[] = Object.entries(val)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => a.createdAt - b.createdAt);
    callback(list);
  });
  return () => {
    off(chatRef, 'value', handler);
  };
}

/** 清空整個房間的聊天（房主重置 / 房間廢棄時用） */
export function clearChatMessages(roomId: string): Promise<void> {
  return remove(ref(rtdb, `rooms-live/${roomId}/chat`));
}
