import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types/user';

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  setProfile: (profile: UserProfile | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: true,
  setProfile: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
