import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { FavoriteLink } from '../types/history';

const FAVORITE_SUBCOLLECTION = 'favoriteGameHistory';
const favoriteRef = (uid: string, entryId: string) =>
  doc(db, 'users', uid, FAVORITE_SUBCOLLECTION, entryId);

/**
 * 我的最愛服務（IMPROVEMENTS #22 Phase 3）
 *
 * 設計：每個使用者有獨立的 favoriteGameHistory 子集合
 * 「加到最愛」= 建立 doc，「取消」= 刪除 doc
 * 與 savedGameHistory 完全獨立（刪 saved 不會影響 favorite）
 */

/** 加到最愛（冪等：已存在則不做事） */
export async function addFavorite(uid: string, entryId: string): Promise<void> {
  const ref = favoriteRef(uid, entryId);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  const link: FavoriteLink = {
    entryId,
    favoritedAt: Date.now(),
  };
  await setDoc(ref, link);
}

/** 取消最愛 */
export async function removeFavorite(uid: string, entryId: string): Promise<void> {
  await deleteDoc(favoriteRef(uid, entryId));
}

/** 切換最愛狀態 */
export async function toggleFavorite(uid: string, entryId: string): Promise<boolean> {
  const ref = favoriteRef(uid, entryId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { entryId, favoritedAt: Date.now() } as FavoriteLink);
  return true;
}

/** 取得使用者所有最愛 */
export async function getUserFavorites(uid: string): Promise<FavoriteLink[]> {
  const snap = await getDocs(collection(db, 'users', uid, FAVORITE_SUBCOLLECTION));
  const out: FavoriteLink[] = [];
  for (const d of snap.docs) {
    const data = d.data() as FavoriteLink;
    if (data && data.entryId) {
      out.push(data);
    }
  }
  return out;
}

/** 訂閱使用者的最愛 */
export function subscribeUserFavorites(
  uid: string,
  callback: (links: FavoriteLink[]) => void,
): () => void {
  return onSnapshot(collection(db, 'users', uid, FAVORITE_SUBCOLLECTION), (snap) => {
    const out: FavoriteLink[] = [];
    for (const d of snap.docs) {
      const data = d.data() as FavoriteLink;
      if (data && data.entryId) {
        out.push(data);
      }
    }
    callback(out);
  });
}

/** 檢查某 entry 是否在 favorites（給 PublicReplay 顯示狀態用） */
export async function isFavorited(uid: string, entryId: string): Promise<boolean> {
  const snap = await getDoc(favoriteRef(uid, entryId));
  return snap.exists();
}
