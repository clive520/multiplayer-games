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
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { auth } from '../auth/firebaseInstances';
import { generateRoomCode, normalizeRoomCode } from '../utils/roomCode';
import { hashPassword, isValidPasswordFormat, normalizePassword } from '../utils/password';
import { getGameDefinition } from '@/registry';
import { recordGameResult } from './statsService';
import { recordGameHistory } from './historyService';
import type { GameType, Room, RoomPlayer, RoomStatus, RoomSummary } from '../types/room';

const ROOMS_COLLECTION = 'rooms';
const PASSWORD_INDEX_COLLECTION = 'passwordIndex';
const SECRET_PASSWORD_DOC = 'password';
const MAX_LOBBY_ROOMS = 20;
const ABANDONED_ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 分鐘無活動視為廢棄

const PASSWORD_ERROR_MESSAGES = {
  invalidFormat: '密碼格式錯誤：必須是 6 位數字',
  taken: '此密碼已被其他房間使用，請更換一個',
  incorrect: '密碼錯誤',
  required: '此房間需要密碼',
};

function tsToMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
}

function roomFromDoc(id: string, data: Record<string, unknown>): Room {
  const now = Date.now();
  return {
    id,
    code: (data.code as string) ?? '',
    gameType: data.gameType as GameType,
    hostId: data.hostId as string,
    status: data.status as RoomStatus,
    players: (data.players as RoomPlayer[]) ?? [],
    playerUids: (data.playerUids as string[]) ?? [],
    hasPassword: (data.hasPassword as boolean) ?? false,
    createdAt: tsToMillis(data.createdAt),
    lastActivityAt: tsToMillis(data.lastActivityAt) || now,
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
    code: (data.code as string) ?? '',
    gameType: data.gameType as GameType,
    hostName: host?.displayName ?? 'Unknown',
    playerCount: players.length,
    maxPlayers: def?.maxPlayers ?? 2,
    status: data.status as RoomStatus,
    hasPassword: (data.hasPassword as boolean) ?? false,
    createdAt: tsToMillis(data.createdAt),
  };
}

function ensureAuth(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('使用者未登入');
  return user.uid;
}

function buildPlayerEntry(
  uid: string,
  nickname: string,
  symbol: string,
  isHost: boolean
): RoomPlayer {
  const user = auth.currentUser!;
  return {
    uid,
    displayName: nickname,
    photoURL: user.photoURL ?? null,
    symbol,
    ready: isHost,
    isHost,
  };
}

async function reservePasswordIndex(hash: string, roomId: string): Promise<void> {
  const indexRef = doc(db, PASSWORD_INDEX_COLLECTION, hash);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(indexRef);
      if (snap.exists()) {
        throw new Error(PASSWORD_ERROR_MESSAGES.taken);
      }
      tx.set(indexRef, { roomId, createdAt: serverTimestamp() });
    });
  } catch (err) {
    if (err instanceof Error && err.message === PASSWORD_ERROR_MESSAGES.taken) {
      throw err;
    }
    throw new Error(PASSWORD_ERROR_MESSAGES.taken);
  }
}

async function releasePasswordIndex(hash: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PASSWORD_INDEX_COLLECTION, hash));
  } catch (err) {
    console.warn('釋放密碼索引失敗（可能已被清理）', err);
  }
}

async function storeRoomPassword(roomId: string, hash: string): Promise<void> {
  await setDoc(doc(db, ROOMS_COLLECTION, roomId, 'secret', SECRET_PASSWORD_DOC), {
    hash,
    updatedAt: serverTimestamp(),
  });
}

async function getRoomPasswordHash(roomId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, ROOMS_COLLECTION, roomId, 'secret', SECRET_PASSWORD_DOC));
  if (!snap.exists()) return null;
  return (snap.data().hash as string) ?? null;
}

async function deleteRoomPassword(roomId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ROOMS_COLLECTION, roomId, 'secret', SECRET_PASSWORD_DOC));
  } catch (err) {
    console.warn('刪除房間密碼子文件失敗', err);
  }
}

export interface CreateRoomOptions {
  password?: string;
  nickname?: string;
}

export async function createRoom(
  gameType: GameType,
  options: CreateRoomOptions = {}
): Promise<string> {
  const uid = ensureAuth();
  const nickname = options.nickname?.trim();
  if (!nickname) throw new Error('暱稱尚未載入，請稍候再試');
  const def = getGameDefinition(gameType);
  if (!def) throw new Error(`未註冊的遊戲類型：${gameType}`);

  const password = options.password?.trim() || '';
  const hasPassword = password.length > 0;
  let passwordHash: string | null = null;

  if (hasPassword) {
    if (!isValidPasswordFormat(password)) {
      throw new Error(PASSWORD_ERROR_MESSAGES.invalidFormat);
    }
    passwordHash = await hashPassword(password);
  }

  const roomRef = doc(collection(db, ROOMS_COLLECTION));
  const code = generateRoomCode();
  const player = buildPlayerEntry(uid, nickname, 'X', true);
  const now = Date.now();

  if (hasPassword && passwordHash) {
    await reservePasswordIndex(passwordHash, roomRef.id);
  }

  try {
    // 先建立 room doc（此時 secret 子規則裡的 get() 才能查到 hostId）
    await setDoc(roomRef, {
      code,
      gameType,
      hostId: uid,
      status: 'waiting' as RoomStatus,
      players: [player],
      playerUids: [uid],
      hasPassword,
      createdAt: serverTimestamp(),
      lastActivityAt: now,
      startedAt: null,
      endedAt: null,
      winnerId: null,
      isDraw: false,
    });
  } catch (err) {
    if (hasPassword && passwordHash) {
      await releasePasswordIndex(passwordHash);
    }
    throw err;
  }

  if (hasPassword && passwordHash) {
    try {
      await storeRoomPassword(roomRef.id, passwordHash);
    } catch (err) {
      // room 已建立但密碼寫入失敗，清理
      try {
        await deleteDoc(roomRef);
      } catch {
        // ignore
      }
      await releasePasswordIndex(passwordHash);
      throw err;
    }
  }

  return roomRef.id;
}

export interface JoinRoomOptions {
  password?: string;
  nickname?: string;
}

export async function joinRoomByCode(
  code: string,
  options: JoinRoomOptions = {}
): Promise<string> {
  const uid = ensureAuth();
  const nickname = options.nickname?.trim();
  if (!nickname) throw new Error('暱稱尚未載入，請稍候再試');
  const normalized = normalizeRoomCode(code);
  if (!/^[A-Z2-9]{6}$/.test(normalized)) {
    throw new Error('房號格式錯誤（6 碼英數字，不含 0/1/I/O）');
  }

  // 只用 where('code', '==', X) 單一查詢（單欄位索引已內建）
  // 避免 where + where 跨欄位的複合索引需求
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('code', '==', normalized),
    limit(5)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error('找不到此房號的房間');
  }

  // 挑選「等待中」或「進行中」的房間（房號理論上唯一，但防呆）
  const activeDoc = snapshot.docs
    .map((d) => ({ ref: d.ref, room: roomFromDoc(d.id, d.data()) }))
    .find((r) => r.room.status === 'waiting' || r.room.status === 'playing');

  if (!activeDoc) {
    throw new Error('找不到此房號的房間');
  }

  const { ref: roomDocRef, room } = activeDoc;
  const def = getGameDefinition(room.gameType);
  if (!def) throw new Error('房間使用未知的遊戲類型');

  if (room.players.some((p) => p.uid === uid)) {
    return roomDocRef.id;
  }

  if (room.hasPassword) {
    const password = options.password ?? '';
    if (!password) {
      throw new Error(PASSWORD_ERROR_MESSAGES.required);
    }
    if (!isValidPasswordFormat(normalizePassword(password))) {
      throw new Error(PASSWORD_ERROR_MESSAGES.invalidFormat);
    }
    const storedHash = await getRoomPasswordHash(roomDocRef.id);
    if (!storedHash) {
      throw new Error(PASSWORD_ERROR_MESSAGES.incorrect);
    }
    const inputHash = await hashPassword(password);
    if (inputHash !== storedHash) {
      throw new Error(PASSWORD_ERROR_MESSAGES.incorrect);
    }
  }

  if (room.players.length >= def.maxPlayers) {
    throw new Error('房間已滿');
  }

  const usedSymbols = new Set(room.players.map((p) => p.symbol));
  const symbol = ['X', 'O', 'A', 'B'].find((s) => !usedSymbols.has(s)) ?? `P${room.players.length + 1}`;
  const newPlayer = buildPlayerEntry(uid, nickname, symbol, false);

  await updateDoc(roomDocRef, {
    players: [...room.players, newPlayer],
    playerUids: [...room.playerUids, uid],
    lastActivityAt: Date.now(),
  });
  return roomDocRef.id;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const uid = ensureAuth();
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = roomFromDoc(snap.id, snap.data());
  const remaining = room.players.filter((p) => p.uid !== uid);

  // 房間空了：刪除房間與相關資源（密碼索引、secret）
  if (remaining.length === 0) {
    await deleteDoc(ref);
    if (room.hasPassword) {
      const hash = await getRoomPasswordHash(roomId);
      if (hash) await releasePasswordIndex(hash);
      await deleteRoomPassword(roomId);
    }
    return;
  }

  // 還有其他玩家：更新房間狀態
  const updates: Record<string, unknown> = {
    players: remaining,
    playerUids: remaining.map((p) => p.uid),
    lastActivityAt: Date.now(),
  };

  // 房主轉移邏輯：如果離開的是房主，自動把主持權轉給下一位
  // （陣列中第一個剩餘玩家 = 最早加入的非房主玩家）
  let winnerUidAfterForfeit: string | null = null;
  if (room.hostId === uid) {
    const newHost = remaining[0];
    const transferredPlayer: RoomPlayer = {
      ...newHost,
      isHost: true,
      ready: true, // 新房主預設為「準備」狀態
    };
    remaining[0] = transferredPlayer;
    updates.players = remaining;
    updates.hostId = transferredPlayer.uid;
  }

  // 主動離開 → 若遊戲進行中，直接 forfeit（離開者敗）
  if (room.status === 'playing') {
    winnerUidAfterForfeit = remaining[0].uid; // 第一個剩餘玩家 = 勝者
    updates.status = 'finished' as RoomStatus;
    updates.endedAt = serverTimestamp();
    updates.winnerId = winnerUidAfterForfeit;
    updates.isDraw = false;
  }

  await updateDoc(ref, updates);

  // 如果是 forfeit，補上 stats 與歷史記錄
  if (winnerUidAfterForfeit) {
    const playersForStats = room.players.map((p) => ({
      uid: p.uid,
      nickname: p.displayName,
      photoURL: p.photoURL,
    }));
    await Promise.all([
      recordGameResult({
        gameType: room.gameType,
        winnerId: winnerUidAfterForfeit,
        isDraw: false,
        players: playersForStats,
      }).catch((err) => {
        console.error('更新使用者 stats 失敗', err);
      }),
      recordGameHistory({
        roomId,
        gameType: room.gameType,
        winnerId: winnerUidAfterForfeit,
        isDraw: false,
        players: room.players.map((p) => ({
          uid: p.uid,
          nickname: p.displayName,
          displayName: p.displayName,
          photoURL: p.photoURL,
          symbol: p.symbol,
        })),
      }).catch((err) => {
        console.error('寫入對戰歷史失敗', err);
      }),
    ]);
  }
}

export async function setPlayerReady(roomId: string, ready: boolean): Promise<void> {
  const uid = ensureAuth();
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('房間不存在');

  const room = roomFromDoc(snap.id, snap.data());
  const players = room.players.map((p) => (p.uid === uid ? { ...p, ready } : p));
  await updateDoc(ref, { players, lastActivityAt: Date.now() });
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
    lastActivityAt: Date.now(),
  });
}

export async function finishGame(
  roomId: string,
  winnerId: string | null,
  isDraw: boolean
): Promise<void> {
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = roomFromDoc(snap.id, snap.data());
  if (room.status === 'finished') return;

  await updateDoc(ref, {
    status: 'finished' as RoomStatus,
    endedAt: serverTimestamp(),
    winnerId,
    isDraw,
    lastActivityAt: Date.now(),
  });

  const playersForStats = room.players.map((p) => ({
    uid: p.uid,
    nickname: p.displayName,
    photoURL: p.photoURL,
  }));
  await Promise.all([
    recordGameResult({
      gameType: room.gameType,
      winnerId,
      isDraw,
      players: playersForStats,
    }).catch((err) => {
      console.error('更新使用者 stats 失敗', err);
    }),
    recordGameHistory({
      roomId,
      gameType: room.gameType,
      winnerId,
      isDraw,
      players: room.players.map((p) => ({
        uid: p.uid,
        nickname: p.displayName,
        displayName: p.displayName,
        photoURL: p.photoURL,
        symbol: p.symbol,
      })),
    }).catch((err) => {
      console.error('寫入對戰歷史失敗', err);
    }),
  ]);
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
    lastActivityAt: Date.now(),
  });
}

export interface RoomLookupResult {
  roomId: string;
  hasPassword: boolean;
  gameType: GameType;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
}

export async function lookupRoomByCode(code: string): Promise<RoomLookupResult | null> {
  const normalized = normalizeRoomCode(code);
  if (!/^[A-Z2-9]{6}$/.test(normalized)) return null;

  // 與 joinRoomByCode 一致：只查 code，狀態在 client 端過濾
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('code', '==', normalized),
    limit(5)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const activeRoom = snapshot.docs
    .map((d) => roomFromDoc(d.id, d.data()))
    .find((r) => r.status === 'waiting' || r.status === 'playing');
  if (!activeRoom) return null;

  const def = getGameDefinition(activeRoom.gameType);
  return {
    roomId: activeRoom.id,
    hasPassword: activeRoom.hasPassword,
    gameType: activeRoom.gameType,
    playerCount: activeRoom.players.length,
    maxPlayers: def?.maxPlayers ?? 2,
    status: activeRoom.status,
  };
}

export interface CleanupResult {
  deletedCount: number;
  details: Array<{ roomId: string; reason: 'empty' | 'abandoned' }>;
}

export async function cleanupAbandonedRooms(): Promise<CleanupResult> {
  // 不加 where + orderBy 的複合查詢（避免需要複合索引）
  // 先撈所有 waiting/playing 的房間，client 端再依 lastActivityAt 篩選
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('status', 'in', ['waiting', 'playing']),
    limit(50)
  );
  const snapshot = await getDocs(q);
  const now = Date.now();
  const result: CleanupResult = { deletedCount: 0, details: [] };

  // 依 lastActivityAt 由舊到新排序（client 端）
  const candidates = snapshot.docs
    .map((d) => roomFromDoc(d.id, d.data()))
    .sort((a, b) => a.lastActivityAt - b.lastActivityAt);

  for (const room of candidates) {
    const isEmpty = room.players.length === 0;
    const isAbandoned = now - room.lastActivityAt > ABANDONED_ROOM_TIMEOUT_MS;
    if (!isEmpty && !isAbandoned) continue;

    try {
      if (room.hasPassword) {
        const hash = await getRoomPasswordHash(room.id);
        if (hash) await releasePasswordIndex(hash);
        await deleteRoomPassword(room.id);
      }
      await deleteDoc(doc(db, ROOMS_COLLECTION, room.id));
      result.deletedCount++;
      result.details.push({
        roomId: room.id,
        reason: isEmpty ? 'empty' : 'abandoned',
      });
    } catch (err) {
      console.warn(`清理房間 ${room.id} 失敗`, err);
    }
  }

  return result;
}

export function subscribeRoom(
  roomId: string,
  onRoom: (room: Room | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = doc(db, ROOMS_COLLECTION, roomId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onRoom(null);
        return;
      }
      onRoom(roomFromDoc(snap.id, snap.data()));
    },
    (err) => {
      console.error('subscribeRoom error', err);
      onError?.(err);
    }
  );
}

export function subscribeLobby(
  onRooms: (rooms: RoomSummary[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ROOMS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(MAX_LOBBY_ROOMS * 3)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rooms = snapshot.docs
        .map((d) => roomSummaryFromDoc(d.id, d.data()))
        .filter((r) => r.status === 'waiting' || r.status === 'playing')
        .slice(0, MAX_LOBBY_ROOMS);
      onRooms(rooms);
    },
    (err) => {
      console.error('subscribeLobby error', err);
      onError?.(err);
    }
  );
}
