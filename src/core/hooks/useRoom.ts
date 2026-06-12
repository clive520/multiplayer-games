import { useEffect, useState } from 'react';
import { subscribeRoom } from '../services/roomService';
import type { Room } from '../types/room';

export interface UseRoomResult {
  room: Room | null;
  loading: boolean;
  error: Error | null;
}

export function useRoom(roomId: string | null): UseRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeRoom(
      roomId,
      (r) => {
        setRoom(r);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [roomId]);

  return { room, loading, error };
}
