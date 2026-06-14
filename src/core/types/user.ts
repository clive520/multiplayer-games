export interface UserProfile {
  uid: string;
  nickname: string;
  nicknameNumber: number;
  email: string | null;
  photoURL: string | null;
  googleDisplayName: string | null;
  isCustomNickname: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_NICKNAME_PREFIX = '玩家';

export function formatDefaultNickname(n: number): string {
  return `${DEFAULT_NICKNAME_PREFIX}${String(n).padStart(3, '0')}`;
}

export function isDefaultNicknameFormat(nickname: string): boolean {
  return new RegExp(`^${DEFAULT_NICKNAME_PREFIX}\\d{3,}$`).test(nickname);
}
