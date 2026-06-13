/**
 * 房間密碼工具
 * - 6 位數字
 * - SHA-256 hash
 * - 唯一性檢查透過 passwordIndex collection
 */

export const PASSWORD_LENGTH = 6;
export const PASSWORD_PATTERN = /^\d{6}$/;

export function isValidPasswordFormat(password: string): boolean {
  return PASSWORD_PATTERN.test(password);
}

export function normalizePassword(password: string): string {
  return password.trim();
}

export async function hashPassword(password: string): Promise<string> {
  const normalized = normalizePassword(password);
  if (!isValidPasswordFormat(normalized)) {
    throw new Error('密碼格式錯誤：必須是 6 位數字');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}
