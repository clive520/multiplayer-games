import { ref, push, set, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase/rtdb';

export interface RoomReaction {
  id: string;
  emoji: string;
  uid: string;
  displayName: string;
  xPct: number;
  createdAt: number;
}

const REACTION_TTL_MS = 3500;
const REACTION_DISPLAY_MS = 7000;

export function sendReaction(
  roomId: string,
  args: { emoji: string; uid: string; displayName: string },
): void {
  const reactionsRef = ref(rtdb, `rooms-live/${roomId}/reactions`);
  const newRef = push(reactionsRef);
  const xPct = 10 + Math.random() * 80;
  set(newRef, {
    emoji: args.emoji,
    uid: args.uid,
    displayName: args.displayName,
    xPct,
    createdAt: Date.now(),
  }).catch((err) => {
    console.warn('傳送反應失敗', err);
  });
  setTimeout(() => {
    set(newRef, null).catch(() => {
      // 已被別人刪掉或權限失效，忽略
    });
  }, REACTION_TTL_MS);
}

export function subscribeReactions(
  roomId: string,
  callback: (reactions: RoomReaction[]) => void,
): () => void {
  const reactionsRef = ref(rtdb, `rooms-live/${roomId}/reactions`);
  const handler = onValue(reactionsRef, (snap) => {
    const val = snap.val() as Record<string, Omit<RoomReaction, 'id'>> | null;
    if (!val) {
      callback([]);
      return;
    }
    const now = Date.now();
    const list: RoomReaction[] = [];
    for (const [id, r] of Object.entries(val)) {
      if (r && now - r.createdAt < REACTION_DISPLAY_MS) {
        list.push({ id, ...r });
      }
    }
    callback(list);
  });
  return () => {
    off(reactionsRef, 'value', handler);
  };
}
