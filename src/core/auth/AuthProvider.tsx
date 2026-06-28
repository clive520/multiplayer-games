import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, getIdTokenResult, type User } from 'firebase/auth';
import { auth } from './firebaseInstances';
import { AuthContext, type AuthContextValue } from './useAuth';
import { ensureProfile, subscribeProfile, updateNickname } from '../services/profileService';
import type { UserProfile } from '../types/user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // 1. Firebase Auth 狀態變化 → 設定 user，並在登入時確保 profile 存在
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        try {
          // 偵測 SSO 用戶（uid 開頭 "sso:"）→ 提取 custom claims 的 ssoName 當 displayName
          let ssoDisplayName: string | null = null;
          if (currentUser.uid.startsWith('sso:')) {
            try {
              const tokenResult = await getIdTokenResult(currentUser);
              ssoDisplayName = (tokenResult.claims.ssoName as string | undefined) ?? null;
            } catch (err) {
              console.warn('讀取 SSO custom claims 失敗', err);
            }
          }

          await ensureProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            googleDisplayName: ssoDisplayName ?? currentUser.displayName,
          });
        } catch (err) {
          console.error('建立/讀取 profile 失敗', err);
        }
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // SSO 用戶：當 profile 載入後若 nickname 仍是預設「玩家N」格式（isCustomNickname=false），自動改成 SSO name
  useEffect(() => {
    if (!user || !profile) return;
    if (!user.uid.startsWith('sso:')) return;
    if (profile.isCustomNickname) return; // 用戶已自訂過，不要覆寫
    // 拿 ssoName（從 custom claims），失敗就跳過
    getIdTokenResult(user)
      .then(async (tokenResult) => {
        const ssoName = tokenResult.claims.ssoName as string | undefined;
        if (!ssoName) return;
        if (profile.nickname === ssoName) return; // 已經一樣
        try {
          await updateNickname(user.uid, ssoName);
        } catch (err) {
          console.warn('SSO 自動設定暱稱失敗', err);
        }
      })
      .catch((err) => console.warn('SSO 讀取 token claims 失敗', err));
  }, [user, profile]);

  // 2. 訂閱 profile 變化（首次建立後也會自動收到）
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const unsubscribe = subscribeProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    profileLoading,
    setProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
