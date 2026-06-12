import { useEffect, useState } from 'react';
import { subscribeRoom } from '../services/roomService';
import type { Room } from '../types/room';

export function useRoom(roomId: string | null): { room: Room | null; loading: boolean } {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeRoom(roomId, (r) => {
      setRoom(r);
      setLoading(false);
    });
    return unsubscribe;
  }, [roomId]);

  return { room, loading };
}
