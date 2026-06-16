import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryConstraint,
  type DocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';
import { ref as rtdbRef, get as rtdbGet, remove as rtdbRemove } from 'firebase/database';
import { db } from '../firebase/firestore';
import { rtdb } from '../firebase/rtdb';
import type { GameHistoryEntry, SavedHistoryLink, SavedOutcome } from '../types/history';
import { MOVES_CAP, SAVED_HISTORY_PER_USER_CAP } from '../types/history';
import type { GameType, Room } from '../types/room';
import type { MoveRecord } from '../types/game';
import { getInitialBoard } from '../utils/board';
import { isAIPlayerUid } from '../types/ai';

const HISTORY_COLLECTION = 'gameHistory';

/**
 * 棋譜歷史服務（IMPROVEMENTS #22 棋譜分享）
 *
 * 為什麼用 Firestore 而非 RTDB：
 * - 棋譜是**永久資料**（不隨房間消失）
 * - 需支援 query（探索頁篩選、Profile 列表）
 * - Firestore 索引比 RTDB 強
 *
 * 結構：
 * - `gameHistory/{entryId}` — 棋譜本體（公開）
 * - `users/{uid}/savedGameHistory/{entryId}` — 每人的「我儲存了」連結
 * - `users/{uid}/favoriteGameHistory/{entryId}` — 每人的「我的最愛」連結
 */

// =============================================================
// 棋譜本體 CRUD
// =============================================================

/**
 * 建立棋譜歷史（在對局結束時呼叫）
 *
 * 流程：
 * 1. 截斷 moves（超過 MOVES_CAP）
 * 2. 計算 totalMoves、truncated、hasAI
 * 3. 寫入 gameHistory/{autoId}
 * 4. 為每個 player / spectator 自動建立 savedGameHistory link
 *
 * 回傳 entryId
 */
export async function createHistoryEntry(args: {
  roomId: string;
  gameType: GameType;
  startedAt: number;
  endedAt: number;
  winnerId: string | null;
  isDraw: boolean;
  playerUids: string[];
  playerNames: Record<string, string>;
  spectatorUids: string[];
  moves: MoveRecord[];
  initialBoard: string[];
  hasAI?: boolean;
}): Promise<string> {
  const cap = MOVES_CAP[args.gameType];
  const truncated = args.moves.length > cap;
  const moves = truncated ? args.moves.slice(0, cap) : args.moves;
  const totalMoves = args.moves.length; // 真實步數（含截斷的）

  const entry: Omit<GameHistoryEntry, 'id'> = {
    roomId: args.roomId,
    gameType: args.gameType,
    startedAt: args.startedAt,
    endedAt: args.endedAt,
    winnerId: args.winnerId,
    isDraw: args.isDraw,
    playerUids: args.playerUids,
    playerNames: args.playerNames,
    spectatorUids: args.spectatorUids,
    moves,
    initialBoard: args.initialBoard,
    totalMoves,
    truncated,
    createdAt: Date.now(),
    hasAI: args.hasAI ?? false,
  };

  const ref = doc(collection(db, HISTORY_COLLECTION));
  await setDoc(ref, entry);
  const entryId = ref.id;

  // 不在 server 端自動建立 saved link
  // 原因：Firestore rules 要求 savedGameHistory 的 create 必須是 isSelf(uid)，
  // server 端的 auth.uid 只能為呼叫者本人建，無法為其他玩家/觀戰者建。
  // 改由各 player/spectator 的 client 端在 GameRoom 看到 finished 時自己 create。
  // （IMPROVEMENTS #22 修：原本是 server-side loop，會只建房主的 link。）

  return entryId;
}

/**
 * Client-side 自動 link 工具（IMPROVEMENTS #22 修）
 * - 在 GameRoom 看到 room.status === 'finished' 時呼叫
 * - 只 link 當前登入使用者（auth.uid == uid，符合 rules）
 * - 如果已有 link 就跳過
 */
export async function ensureAutoLinkedToHistory(
  uid: string,
  entryId: string,
  outcome: SavedOutcome,
): Promise<void> {
  // 檢查是否已存在
  const existing = await getDoc(savedRef(uid, entryId));
  if (existing.exists()) return;
  await linkUserToHistory(uid, entryId, {
    entryId,
    yourSymbol: null,
    yourOutcome: outcome,
    linkedAt: Date.now(),
    source: 'auto',
  });
}

/** 取得單一棋譜 */
export async function getHistoryEntry(entryId: string): Promise<GameHistoryEntry | null> {
  const snap = await getDoc(doc(db, HISTORY_COLLECTION, entryId));
  if (!snap.exists()) return null;
  return normalizeEntry(snap.id, snap.data() as Record<string, unknown>);
}

/** 訂閱單一棋譜（live） */
export function subscribeHistoryEntry(
  entryId: string,
  callback: (entry: GameHistoryEntry | null) => void,
): () => void {
  return onSnapshot(doc(db, HISTORY_COLLECTION, entryId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(normalizeEntry(snap.id, snap.data() as Record<string, unknown>));
  });
}

/**
 * 正規化單一棋譜 doc（IMPROVEMENTS #22 修）
 * - 舊版寫入的 doc 可能缺欄位（如 #22 client-side auto-link 修好前的 doc）
 * - 缺欄位會讓前端 `.map` 崩潰
 * - 補上預設值讓前端程式碼可以安全存取
 */
function normalizeEntry(id: string, data: Record<string, unknown>): GameHistoryEntry {
  return {
    id,
    roomId: (data.roomId as string) ?? '',
    gameType: (data.gameType as GameHistoryEntry['gameType']) ?? 'tictactoe',
    startedAt: (data.startedAt as number) ?? 0,
    endedAt: (data.endedAt as number) ?? 0,
    winnerId: (data.winnerId as string | null) ?? null,
    isDraw: (data.isDraw as boolean) ?? false,
    playerUids: Array.isArray(data.playerUids) ? (data.playerUids as string[]) : [],
    playerNames: (data.playerNames as Record<string, string>) ?? {},
    spectatorUids: Array.isArray(data.spectatorUids) ? (data.spectatorUids as string[]) : [],
    moves: Array.isArray(data.moves) ? (data.moves as GameHistoryEntry['moves']) : [],
    initialBoard: Array.isArray(data.initialBoard) ? (data.initialBoard as string[]) : [],
    totalMoves: (data.totalMoves as number) ?? 0,
    truncated: (data.truncated as boolean) ?? false,
    createdAt: (data.createdAt as number) ?? 0,
    hasAI: (data.hasAI as boolean) ?? false,
  };
}

/** 批次取得棋譜（給 Profile「我的棋譜」用：先訂閱 saved links，再 batch fetch） */
export async function getHistoryEntriesByIds(entryIds: string[]): Promise<GameHistoryEntry[]> {
  if (entryIds.length === 0) return [];
  // Firestore 'in' 查詢最多 30 個，分批
  const batchSize = 30;
    const batches: string[][] = [];
    for (let i = 0; i < entryIds.length; i += batchSize) {
      batches.push(entryIds.slice(i, i + batchSize));
    }
    const results: GameHistoryEntry[] = [];
    for (const batch of batches) {
      const q = query(collection(db, HISTORY_COLLECTION), where('__name__', 'in', batch));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        results.push(normalizeEntry(d.id, d.data() as Record<string, unknown>));
      }
    }
    return results;
  }

// =============================================================
// Saved History Link
// =============================================================

const SAVED_SUBCOLLECTION = 'savedGameHistory';
const savedRef = (uid: string, entryId: string) =>
  doc(db, 'users', uid, SAVED_SUBCOLLECTION, entryId);

/** 建立 / 更新儲存連結（內部使用） */
export async function linkUserToHistory(
  uid: string,
  entryId: string,
  link: SavedHistoryLink,
): Promise<void> {
  await setDoc(savedRef(uid, entryId), link);
}

/**
 * 公開版：手動儲存別人的棋譜
 * - 自動偵測 outcome（用 entry 資料）
 * - 觸發每使用者上限 200 檢查
 */
export async function saveHistoryEntry(uid: string, entry: GameHistoryEntry): Promise<void> {
  // 上限檢查：先列出目前 saved，超過時移除最舊
  const existing = await getUserSavedLinks(uid);
  if (existing.length >= SAVED_HISTORY_PER_USER_CAP) {
    // 移除最舊 N 個（直到比上限少 1）
    const sorted = [...existing].sort((a, b) => a.linkedAt - b.linkedAt);
    const toRemove = sorted.slice(0, existing.length - SAVED_HISTORY_PER_USER_CAP + 1);
    for (const link of toRemove) {
      await unlinkUserFromHistory(uid, link.entryId);
    }
  }

  // 用 entry 推算 outcome
  const isPlayer = entry.playerUids.includes(uid);
  const outcome: SavedOutcome = !isPlayer
    ? 'spectator'
    : entry.isDraw
      ? 'draw'
      : entry.winnerId === uid
        ? 'win'
        : 'lose';

  await linkUserToHistory(uid, entry.id, {
    entryId: entry.id,
    yourSymbol: null,
    yourOutcome: outcome,
    linkedAt: Date.now(),
    source: 'manual',
  });
}

/** 刪除儲存連結（軟刪除棋譜） */
export async function unlinkUserFromHistory(uid: string, entryId: string): Promise<void> {
  await setDoc(savedRef(uid, entryId), { _deleted: true, _deletedAt: Date.now() }, { merge: false }).catch(async () => {
    // 改用 delete
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(savedRef(uid, entryId));
  });
}

/** 取得使用者所有 saved links（不含已刪除） */
export async function getUserSavedLinks(uid: string): Promise<SavedHistoryLink[]> {
  const snap = await getDocs(collection(db, 'users', uid, SAVED_SUBCOLLECTION));
  const out: SavedHistoryLink[] = [];
  for (const d of snap.docs) {
    const data = d.data() as SavedHistoryLink;
    if (data && !('_deleted' in data)) {
      out.push(data);
    }
  }
  return out;
}

/** 訂閱使用者的 saved links */
export function subscribeUserSavedLinks(
  uid: string,
  callback: (links: SavedHistoryLink[]) => void,
): () => void {
  return onSnapshot(collection(db, 'users', uid, SAVED_SUBCOLLECTION), (snap) => {
    const out: SavedHistoryLink[] = [];
    for (const d of snap.docs) {
      const data = d.data() as SavedHistoryLink;
      if (data && !('_deleted' in data)) {
        out.push(data);
      }
    }
    callback(out);
  });
}

// =============================================================
// 整合：從 Room 結束時自動存歷史（IMPROVEMENTS #22 Phase 1）
// =============================================================

/**
 * 從 RTDB 房間節點讀取棋譜，寫入 Firestore history，並清空 RTDB
 * - 給 finishGame / leaveRoom 的 forfeit 路徑呼叫
 * - 失敗不擋主流程（會 console.error）
 */
export async function archiveFinishedRoomToHistory(room: Room): Promise<string | null> {
  if (room.status !== 'finished') return null;
  try {
    // 從 RTDB 讀取完整 state
    const stateRef = rtdbRef(rtdb, `rooms-live/${room.id}/state`);
    const snap = await rtdbGet(stateRef);
    if (!snap.exists()) {
      console.warn(`[history] 房間 ${room.id} RTDB state 不存在，無法存棋譜`);
      return null;
    }
    const state = snap.val() as { moves?: MoveRecord[] };
    const moves = state.moves ?? [];

    // 寫入 history
    const entryId = await createHistoryEntry({
      roomId: room.id,
      gameType: room.gameType,
      startedAt: room.startedAt ?? room.createdAt,
      endedAt: room.endedAt ?? Date.now(),
      winnerId: room.winnerId,
      isDraw: room.isDraw,
      playerUids: room.players.filter((p) => !isAIPlayerUid(p.uid)).map((p) => p.uid),
      playerNames: Object.fromEntries(
        room.players.filter((p) => !isAIPlayerUid(p.uid)).map((p) => [p.uid, p.displayName]),
      ),
      spectatorUids: room.spectators.map((s) => s.uid).filter((u) => !isAIPlayerUid(u)),
      moves,
      initialBoard: getInitialBoard(room.gameType) as string[],
      hasAI: room.players.some((p) => isAIPlayerUid(p.uid)),
    });

    // 刪除 RTDB 房間節點（state + chat + reactions + undoRequest + presence 一次清掉）
    await rtdbRemove(rtdbRef(rtdb, `rooms-live/${room.id}`)).catch((err) => {
      console.warn(`[history] 刪除 RTDB 房間 ${room.id} 失敗`, err);
    });

    return entryId;
  } catch (err) {
    console.error(`[history] 存棋譜失敗 (room ${room.id})`, err);
    return null;
  }
}

// =============================================================
// 探索 / 搜尋
// =============================================================

export interface HistorySearchFilters {
  gameType?: GameType;
  /** 包含的玩家 UID */
  playerUid?: string;
  /** 是否包含 AI 對局（null = 全部） */
  hasAI?: boolean | null;
  /** 每頁筆數（預設 20） */
  pageSize?: number;
  /** 游標分頁（上一頁最後一筆的 snapshot） */
  cursor?: DocumentSnapshot;
}

/** 公開探索：列出棋譜 */
export async function searchHistory(
  filters: HistorySearchFilters = {},
): Promise<{ entries: GameHistoryEntry[]; nextCursor: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [];
  if (filters.gameType) {
    constraints.push(where('gameType', '==', filters.gameType));
  }
  if (filters.playerUid) {
    constraints.push(where('playerUids', 'array-contains', filters.playerUid));
  }
  if (filters.hasAI !== null && filters.hasAI !== undefined) {
    constraints.push(where('hasAI', '==', filters.hasAI));
  }
  constraints.push(orderBy('endedAt', 'desc'));
  constraints.push(limit(filters.pageSize ?? 20));
  if (filters.cursor) {
    constraints.push(startAfter(filters.cursor));
  }

  const q = query(collection(db, HISTORY_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  const entries: GameHistoryEntry[] = [];
  for (const d of snap.docs) {
    entries.push(normalizeEntry(d.id, d.data() as Record<string, unknown>));
  }
  const nextCursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { entries, nextCursor };
}

/** 訂閱探索（real-time 最新棋譜） */
export function subscribeLatestHistory(
  callback: (entries: GameHistoryEntry[]) => void,
  pageSize = 20,
): () => void {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    orderBy('endedAt', 'desc'),
    limit(pageSize),
  );
  return onSnapshot(q, (snap) => {
    const entries: GameHistoryEntry[] = [];
    for (const d of snap.docs) {
      entries.push(normalizeEntry(d.id, d.data() as Record<string, unknown>));
    }
    callback(entries);
  });
}
