import { useEffect, useState } from 'react';
import { setOnline, setOffline, subscribePresence } from '../services/presenceService';
import { useAuth } from '../auth/useAuth';

export interface PresenceMap {
  [uid: string]: {
    online: boolean;
    lastSeen?: number;
    displayName?: string;
    photoURL?: string | null;
  };
}

export function usePresence(roomId: string | null): PresenceMap {
  const { profile } = useAuth();
  const [presence, setPresence] = useState<PresenceMap>({});

  useEffect(() => {
    if (!roomId || !profile?.nickname) {
      setPresence({});
      return;
    }
    const nickname = profile.nickname;
    setOnline(roomId, nickname).catch((err) => {
      console.error('設定在線狀態失敗', err);
    });
    const unsubscribe = subscribePresence(roomId, (p) => {
      setPresence(p);
    });
    return () => {
      unsubscribe();
      setOffline(roomId, nickname).catch(() => {
        // ignore
      });
    };
  }, [roomId, profile?.nickname]);

  return presence;
}
