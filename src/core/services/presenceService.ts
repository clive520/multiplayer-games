import {
  ref,
  set,
  onDisconnect,
  onValue,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/database';
import { rtdb } from '../firebase/rtdb';
import { auth } from '../auth/firebaseInstances';

const presencePath = (roomId: string, uid: string) =>
  `rooms-live/${roomId}/presence/${uid}`;

export async function setOnline(roomId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const myRef = ref(rtdb, presencePath(roomId, user.uid));
  await set(myRef, {
    online: true,
    lastSeen: serverTimestamp(),
    displayName: user.displayName ?? '匿名玩家',
    photoURL: user.photoURL ?? null,
  });
  await onDisconnect(myRef).set({
    online: false,
    lastSeen: serverTimestamp(),
    displayName: user.displayName ?? '匿名玩家',
    photoURL: user.photoURL ?? null,
  });
}

export async function setOffline(roomId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const myRef = ref(rtdb, presencePath(roomId, user.uid));
  try {
    await onDisconnect(myRef).cancel();
  } catch {
    // ignore
  }
  await set(myRef, {
    online: false,
    lastSeen: serverTimestamp(),
    displayName: user.displayName ?? '匿名玩家',
    photoURL: user.photoURL ?? null,
  });
}

export function subscribePresence(
  roomId: string,
  callback: (presence: Record<string, { online: boolean; lastSeen?: number; displayName?: string; photoURL?: string | null }>) => void
): Unsubscribe {
  const presenceRef = ref(rtdb, `rooms-live/${roomId}/presence`);
  return onValue(presenceRef, (snap) => {
    callback((snap.val() as Record<string, { online: boolean; lastSeen?: number; displayName?: string; photoURL?: string | null }>) ?? {});
  });
}
