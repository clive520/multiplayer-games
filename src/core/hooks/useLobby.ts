import { useEffect, useState } from 'react';
import { subscribeLobby } from '../services/roomService';
import type { RoomSummary } from '../types/room';

export interface UseLobbyResult {
  rooms: RoomSummary[];
  loading: boolean;
  error: Error | null;
}

export function useLobby(): UseLobbyResult {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeLobby(
      (r) => {
        setRooms(r);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { rooms, loading, error };
}
