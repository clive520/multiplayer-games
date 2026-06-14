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

export interface PresencePayload {
  online: boolean;
  lastSeen: unknown;
  displayName: string;
  photoURL: string | null;
}

function buildPayload(nickname: string, online: boolean): PresencePayload {
  const user = auth.currentUser;
  return {
    online,
    lastSeen: serverTimestamp(),
    displayName: nickname,
    photoURL: user?.photoURL ?? null,
  };
}

export async function setOnline(roomId: string, nickname: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const myRef = ref(rtdb, presencePath(roomId, user.uid));
  await set(myRef, buildPayload(nickname, true));
  await onDisconnect(myRef).set(buildPayload(nickname, false));
}

export async function setOffline(roomId: string, nickname: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const myRef = ref(rtdb, presencePath(roomId, user.uid));
  try {
    await onDisconnect(myRef).cancel();
  } catch {
    // ignore
  }
  await set(myRef, buildPayload(nickname, false));
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
