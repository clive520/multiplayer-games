import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { auth } from '../auth/firebaseInstances';

export interface UserStats {
  uid: string;
  displayName: string;
  photoURL: string | null;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  updatedAt: number;
}

export interface LeaderboardEntry extends UserStats {
  winRate: number;
}

function buildStats(uid: string, displayName: string, photoURL: string | null): UserStats {
  return {
    uid,
    displayName,
    photoURL,
    wins: 0,
    losses: 0,
    draws: 0,
    totalGames: 0,
    updatedAt: Date.now(),
  };
}

export async function ensureUserStats(uid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    ...buildStats(uid, user.displayName ?? '匿名玩家', user.photoURL ?? null),
    createdAt: serverTimestamp(),
  });
}

export async function recordGameResult(args: {
  winnerId: string | null;
  isDraw: boolean;
  players: Array<{ uid: string; displayName: string; photoURL: string | null }>;
}): Promise<void> {
  const { winnerId, isDraw, players } = args;
  const now = Date.now();
  const updates = players.map((p) => {
    const ref = doc(db, 'users', p.uid);
    const isWinner = !isDraw && p.uid === winnerId;
    const delta = isDraw
      ? { draws: increment(1), totalGames: increment(1) }
      : isWinner
        ? { wins: increment(1), totalGames: increment(1) }
        : { losses: increment(1), totalGames: increment(1) };
    return updateDoc(ref, {
      ...delta,
      displayName: p.displayName,
      photoURL: p.photoURL,
      updatedAt: now,
    }).catch(async (err) => {
      if (err.code === 'not-found') {
        await setDoc(ref, {
          ...buildStats(p.uid, p.displayName, p.photoURL),
          wins: isWinner ? 1 : 0,
          losses: !isWinner && !isDraw ? 1 : 0,
          draws: isDraw ? 1 : 0,
          totalGames: 1,
          updatedAt: now,
        });
      } else {
        throw err;
      }
    });
  });
  await Promise.all(updates);
}
