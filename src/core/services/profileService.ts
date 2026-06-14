import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  type UserProfile,
  formatDefaultNickname,
} from '../types/user';

const USER_PROFILE_COLLECTION = 'users';
const COUNTER_DOC_PATH = 'meta/counters';
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 12;

export interface NicknameValidation {
  ok: boolean;
  error?: string;
  trimmed: string;
}

export function validateNickname(raw: string): NicknameValidation {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: '暱稱不能為空', trimmed };
  }
  if (trimmed.length < NICKNAME_MIN) {
    return { ok: false, error: `暱稱至少 ${NICKNAME_MIN} 個字`, trimmed };
  }
  if (trimmed.length > NICKNAME_MAX) {
    return { ok: false, error: `暱稱最多 ${NICKNAME_MAX} 個字`, trimmed };
  }
  return { ok: true, trimmed };
}

function readNicknameFromDoc(
  uid: string,
  data: Record<string, unknown>
): UserProfile | null {
  const nickname = (data.nickname as string) ?? null;
  if (!nickname) return null;
  return {
    uid,
    nickname,
    nicknameNumber: (data.nicknameNumber as number) ?? 0,
    email: (data.email as string | null) ?? null,
    photoURL: (data.photoURL as string | null) ?? null,
    googleDisplayName: (data.googleDisplayName as string | null) ?? null,
    isCustomNickname: (data.isCustomNickname as boolean) ?? false,
    createdAt: (data.createdAt as number) ?? Date.now(),
    updatedAt: (data.updatedAt as number) ?? Date.now(),
  };
}

export interface EnsureProfileInput {
  uid: string;
  email: string | null;
  photoURL: string | null;
  googleDisplayName: string | null;
}

export async function ensureProfile(
  input: EnsureProfileInput
): Promise<UserProfile> {
  const ref = doc(db, USER_PROFILE_COLLECTION, input.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const existing = readNicknameFromDoc(input.uid, snap.data());
    if (existing) {
      // 向後相容：若舊資料缺 email/photoURL/googleDisplayName，回填
      const patch: Record<string, unknown> = {};
      if (existing.email == null && input.email != null) patch.email = input.email;
      if (existing.photoURL == null && input.photoURL != null) patch.photoURL = input.photoURL;
      if (existing.googleDisplayName == null && input.googleDisplayName != null) {
        patch.googleDisplayName = input.googleDisplayName;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = Date.now();
        try {
          await updateDoc(ref, patch);
          return { ...existing, ...patch } as UserProfile;
        } catch {
          // 規則拒絕時忽略，仍回傳現有資料
        }
      }
      return existing;
    }
  }

  // 首次登入：用 transaction 取得流水號並建立 profile
  const counterRef = doc(db, COUNTER_DOC_PATH);
  const profile = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists()
      ? (counterSnap.data().userCounter as number) ?? 0
      : 0;
    const next = current + 1;
    const nickname = formatDefaultNickname(next);

    const newProfile: Record<string, unknown> = {
      uid: input.uid,
      nickname,
      nicknameNumber: next,
      email: input.email,
      photoURL: input.photoURL,
      googleDisplayName: input.googleDisplayName,
      isCustomNickname: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    tx.set(ref, newProfile);
    if (counterSnap.exists()) {
      tx.update(counterRef, { userCounter: next, updatedAt: serverTimestamp() });
    } else {
      tx.set(counterRef, {
        userCounter: next,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return newProfile as unknown as UserProfile;
  });

  return profile;
}

export function subscribeProfile(
  uid: string | null,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  if (!uid) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, USER_PROFILE_COLLECTION, uid),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback(readNicknameFromDoc(uid, snap.data()));
    },
    (err) => {
      console.error('subscribeProfile error', err);
      callback(null);
    }
  );
}

export async function updateNickname(uid: string, raw: string): Promise<UserProfile> {
  const v = validateNickname(raw);
  if (!v.ok) {
    throw new Error(v.error ?? '暱稱無效');
  }
  const ref = doc(db, USER_PROFILE_COLLECTION, uid);
  const patch = {
    nickname: v.trimmed,
    isCustomNickname: true,
    updatedAt: Date.now(),
  };
  await setDoc(ref, patch, { merge: true });
  const snap = await getDoc(ref);
  const updated = readNicknameFromDoc(uid, snap.data() ?? patch);
  if (!updated) {
    throw new Error('更新暱稱後讀取失敗');
  }
  return updated;
}
