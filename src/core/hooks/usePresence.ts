import { useEffect, useState } from 'react';
import { setOnline, setOffline, subscribePresence } from '../services/presenceService';

export interface PresenceMap {
  [uid: string]: {
    online: boolean;
    lastSeen?: number;
    displayName?: string;
    photoURL?: string | null;
  };
}

export function usePresence(roomId: string | null): PresenceMap {
  const [presence, setPresence] = useState<PresenceMap>({});

  useEffect(() => {
    if (!roomId) {
      setPresence({});
      return;
    }
    setOnline(roomId).catch((err) => {
      console.error('設定在線狀態失敗', err);
    });
    const unsubscribe = subscribePresence(roomId, (p) => {
      setPresence(p);
    });
    return () => {
      unsubscribe();
      setOffline(roomId).catch(() => {
        // ignore
      });
    };
  }, [roomId]);

  return presence;
}
