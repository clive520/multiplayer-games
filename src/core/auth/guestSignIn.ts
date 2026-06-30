import { signInAnonymously, getAuth, type User } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth } from './firebaseInstances';
import { db } from '../firebase/firestore';
import {
  ensureProfile,
  updateNickname,
  validateNickname,
} from '../services/profileService';

/**
 * 訪客登入流程
 *
 * 流程：
 * 1. validateNickname（2-12 字）
 * 2. signInAnonymously() 取得 Firebase uid（可通過 Firestore / RTDB 規則）
 * 3. 查詢 users 集合確認暱稱沒被使用
 * 4. ensureProfile（AuthProvider 也會同時呼叫，會自然建出「玩家N」預設檔）
 * 5. updateNickname(uid, nickname) → 設為使用者選的暱稱 + isCustomNickname: true
 *
 * 重要：
 * - 此流程不會「匿名身分清除後找回」——若使用者清除瀏覽器資料，
 *   再登入會拿到新的 anonymous uid，舊暱稱就被卡在 users 集合中。
 * - 暱稱唯一性檢查有 race condition（兩人同時選同名），
 *   MVP 接受此風險；未來可在 Firestore 加 nicknames/{nickname} 索引預防。
 */

export async function signInAsGuest(nickname: string): Promise<User> {
  // 1. 格式驗證
  const v = validateNickname(nickname);
  if (!v.ok) {
    throw new Error(v.error ?? '暱稱無效');
  }
  const trimmed = v.trimmed;

  // 2. 匿名登入
  const cred = await signInAnonymously(auth);
  const user = cred.user;

  // 3. 檢查暱稱唯一性（query users 集合）
  try {
    const q = query(
      collection(db, 'users'),
      where('nickname', '==', trimmed),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // 暱稱已被使用 → 清掉剛才的匿名身分（避免殘留）
      try {
        await getAuth().signOut();
      } catch {
        // 忽略
      }
      throw new Error('暱稱已被使用');
    }
  } catch (err) {
    // query 失敗（網路 / 規則）→ 不擋，繼續嘗試寫入
    console.warn('[guest] 暱稱唯一性檢查失敗（繼續嘗試寫入）', err);
  }

  // 4. ensureProfile（AuthProvider 也會同時呼叫，這裡是備援）
  try {
    await ensureProfile({
      uid: user.uid,
      email: null,
      photoURL: null,
      googleDisplayName: null,
    });
  } catch (err) {
    // 不擋：AuthProvider 會兜底
    console.warn('[guest] ensureProfile 失敗', err);
  }

  // 5. 把暱稱改成使用者選的
  try {
    await updateNickname(user.uid, trimmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '寫入暱稱失敗';
    // updateNickname 失敗可能是規則擋掉（極罕見）或 race（撞名）
    console.error('[guest] updateNickname 失敗', msg);
    throw new Error(`無法設定此暱稱：${msg}`);
  }

  return user;
}