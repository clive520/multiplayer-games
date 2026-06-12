import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';

export interface GameHistoryEntry {
  id: string;
  gameType: string;
  roomId: string;
  winnerId: string | null;
  isDraw: boolean;
  players: Array<{ uid: string; displayName: string; photoURL: string | null; symbol: string }>;
  endedAt: number;
  createdAt?: number;
}

function tsToMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return Date.now();
}

function fromDoc(id: string, data: Record<string, unknown>): GameHistoryEntry {
  return {
    id,
    gameType: (data.gameType as string) ?? 'unknown',
    roomId: (data.roomId as string) ?? '',
    winnerId: (data.winnerId as string) ?? null,
    isDraw: (data.isDraw as boolean) ?? false,
    players: (data.players as GameHistoryEntry['players']) ?? [],
    endedAt: tsToMillis(data.endedAt),
    createdAt: data.createdAt ? tsToMillis(data.createdAt) : undefined,
  };
}

export async function recordGameHistory(args: {
  roomId: string;
  gameType: string;
  winnerId: string | null;
  isDraw: boolean;
  players: Array<{ uid: string; displayName: string; photoURL: string | null; symbol: string }>;
}): Promise<void> {
  const endedAt = Date.now();
  const playerUids = args.players.map((p) => p.uid);
  await addDoc(collection(db, 'gameHistory'), {
    ...args,
    playerUids,
    endedAt,
    createdAt: serverTimestamp(),
  });
}

export function subscribeUserHistory(
  uid: string,
  callback: (entries: GameHistoryEntry[]) => void,
  max = 20
): Unsubscribe {
  const q = query(
    collection(db, 'gameHistory'),
    where('playerUids', 'array-contains', uid),
    orderBy('endedAt', 'desc'),
    limit(max)
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => fromDoc(d.id, d.data()));
    callback(entries);
  });
}

export async function fetchUserHistory(uid: string, max = 20): Promise<GameHistoryEntry[]> {
  const q = query(
    collection(db, 'gameHistory'),
    where('playerUids', 'array-contains', uid),
    orderBy('endedAt', 'desc'),
    limit(max)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => fromDoc(d.id, d.data()));
}
