import { useEffect, useState } from 'react';
import { subscribeLobby } from '../services/roomService';
import type { RoomSummary } from '../types/room';

export function useLobby(): { rooms: RoomSummary[]; loading: boolean } {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeLobby((r) => {
      setRooms(r);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { rooms, loading };
}
