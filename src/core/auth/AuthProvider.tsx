import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebaseInstances';
import { AuthContext, type AuthContextValue } from './useAuth';
import { ensureProfile, subscribeProfile } from '../services/profileService';
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
          await ensureProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            googleDisplayName: currentUser.displayName,
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
