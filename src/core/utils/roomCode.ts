const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  const chars: string[] = [];
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    chars.push(CHARSET[array[i] % CHARSET.length]);
  }
  return chars.join('');
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z2-9]{6}$/.test(code);
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
