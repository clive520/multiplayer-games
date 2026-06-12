import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { auth } from '../auth/firebaseInstances';
import { generateRoomCode, normalizeRoomCode } from '../utils/roomCode';
import { getGameDefinition } from '@/registry';
import type { GameType, Room, RoomPlayer, RoomStatus, RoomSummary } from '../types/room';

const ROOMS_COLLECTION = 'rooms';
const MAX_LOBBY_ROOMS = 20;

function tsToMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
}

function roomFromDoc(id: string, data: Record<string, unknown>): Room {
  return {
    id,
    gameType: data.gameType as GameType,
    hostId: data.hostId as string,
    status: data.status as RoomStatus,
    players: (data.players as RoomPlayer[]) ?? [],
    createdAt: tsToMillis(data.createdAt),
    startedAt: data.startedAt ? tsToMillis(data.startedAt) : null,
    endedAt: data.endedAt ? tsToMillis(data.endedAt) : null,
    winnerId: (data.winnerId as string) ?? null,
    isDraw: (data.isDraw as boolean) ?? false,
  };
}

function roomSummaryFromDoc(id: string, data: Record<string, unknown>): RoomSummary {
  const players = (data.players as RoomPlayer[]) ?? [];
  const host = players.find((p) => p.isHost) ?? players[0];
  const def = getGameDefinition(data.gameType as GameType);
  return {
    id,
    gameType: data.gameType as GameType,
    hostName: host?.displayName ?? 'Unknown',
    playerCount: players.length,
    maxPlayers: def?.maxPlayers ?? 2,
    status: data.status as RoomStatus,
    createdAt: tsToMillis(data.createdAt),
  };
}

function ensureAuth(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('使用者未登入');
  return user.uid;
}

function buildPlayerEntry(uid: string, symbol: string, isHost: boolean): RoomPlayer {
  const user = auth.currentUser!;
  return {
    uid,
    displayName: user.displayName ?? '匿名玩家',
    photoURL: user.photoURL ?? null,
    symbol,
    ready: isHost,
    isHost,
  };
}

export async function createRoom(gameType: GameType): Promise<string> {
  const uid = ensureAuth();
  const def = getGameDefinition(gameType);
  if (!def) throw new Error(`未註冊的遊戲類型：${gameType}`);

  const roomRef = doc(collection(db, ROOMS_COLLECTION));
  const code = generateRoomCode();
  const player = buildPlayerEntry(uid, 'X', true);

  const payload = {
    code,
    gameType,
    hostId: uid,
    status: 'waiting' as RoomStatus,
    players: [player],
    createdAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,
    winnerId: null,
    isDraw: false,
  };

  await setDoc(roomRef, payload);
  return roomRef.id;
}

export async function joinRoomByCode(code: string): Promise<string> {
  const uid = ensureAuth();
  const normalized = normalizeRoomCode(code);
  if (!/^[A-Z2-9]{6}$/.test(normalized)) {
    throw new Error('房號格式錯誤（6 碼英數字，不含 0/1/I/O）');
  }

  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('code', '==', normalized),
    where('status', 'in', ['waiting', 'playing']),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error('找不到此房號的房間');
  }

  const roomDoc = snapshot.docs[0];
  const room = roomFromDoc(roomDoc.id, roomDoc.data());
  const def = getGameDefinition(room.gameType);
  if (!def) throw new Error('房間使用未知的遊戲類型');

  if (room.players.some((p) => p.uid === uid)) {
    return roomDoc.id;
  }

  if (room.players.length >= def.maxPlayers) {
    throw new Error('房間已滿');
  }

  const usedSymbols = new Set(room.players.map((p) => p.symbol));
  const symbol = ['X', 'O', 'A', 'B'].find((s) => !usedSymbols.has(s)) ?? `P${room.players.length + 1}`;
  const newPlayer = buildPlayerEntry(uid, symbol, false);

  await updateDoc(roomDoc.ref, {
    players: [...room.players, newPlayer],
  });
  return roomDoc.id;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const uid = ensureAuth();
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = roomFromDoc(snap.id, snap.data());
  const remaining = room.players.filter((p) => p.uid !== uid);

  if (remaining.length === 0) {
    await deleteDoc(ref);
    return;
  }

  if (room.hostId === uid) {
    const newHost = remaining[0];
    remaining[0] = { ...newHost, isHost: true, ready: true };
    await updateDoc(ref, {
      players: remaining,
      hostId: newHost.uid,
    });
  } else {
    await updateDoc(ref, { players: remaining });
  }
}

export async function setPlayerReady(roomId: string, ready: boolean): Promise<void> {
  const uid = ensureAuth();
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('房間不存在');

  const room = roomFromDoc(snap.id, snap.data());
  const players = room.players.map((p) => (p.uid === uid ? { ...p, ready } : p));
  await updateDoc(ref, { players });
}

export async function startGame(roomId: string): Promise<void> {
  const uid = ensureAuth();
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('房間不存在');

  const room = roomFromDoc(snap.id, snap.data());
  if (room.hostId !== uid) throw new Error('只有房主可以開始遊戲');
  if (room.players.length < 2) throw new Error('至少需要 2 位玩家');
  if (!room.players.every((p) => p.ready)) throw new Error('所有玩家必須準備就緒');

  await updateDoc(ref, {
    status: 'playing' as RoomStatus,
    startedAt: serverTimestamp(),
  });
}

export async function finishGame(
  roomId: string,
  winnerId: string | null,
  isDraw: boolean
): Promise<void> {
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(ref, {
    status: 'finished' as RoomStatus,
    endedAt: serverTimestamp(),
    winnerId,
    isDraw,
  });
}

export async function resetRoom(roomId: string): Promise<void> {
  const uid = ensureAuth();
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = roomFromDoc(snap.id, snap.data());
  if (room.hostId !== uid) throw new Error('只有房主可以重置房間');

  const resetPlayers = room.players.map((p) => ({ ...p, ready: p.isHost }));
  await updateDoc(ref, {
    status: 'waiting' as RoomStatus,
    players: resetPlayers,
    startedAt: null,
    endedAt: null,
    winnerId: null,
    isDraw: false,
  });
}

export function subscribeRoom(roomId: string, callback: (room: Room | null) => void): Unsubscribe {
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(roomFromDoc(snap.id, snap.data()));
  });
}

export function subscribeLobby(callback: (rooms: RoomSummary[]) => void): Unsubscribe {
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('status', 'in', ['waiting', 'playing']),
    orderBy('createdAt', 'desc'),
    limit(MAX_LOBBY_ROOMS)
  );
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map((d) => roomSummaryFromDoc(d.id, d.data()));
    callback(rooms);
  });
}
