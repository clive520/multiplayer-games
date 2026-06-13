import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  isValidPasswordFormat,
  normalizePassword,
  PASSWORD_LENGTH,
} from './password';

describe('password utilities', () => {
  describe('isValidPasswordFormat', () => {
    it('接受 6 位數字', () => {
      expect(isValidPasswordFormat('123456')).toBe(true);
      expect(isValidPasswordFormat('000000')).toBe(true);
      expect(isValidPasswordFormat('999999')).toBe(true);
    });

    it('拒絕非 6 位數字', () => {
      expect(isValidPasswordFormat('12345')).toBe(false);
      expect(isValidPasswordFormat('1234567')).toBe(false);
      expect(isValidPasswordFormat('abcdef')).toBe(false);
      expect(isValidPasswordFormat('12345a')).toBe(false);
      expect(isValidPasswordFormat('123 45')).toBe(false);
      expect(isValidPasswordFormat('')).toBe(false);
    });

    it('拒絕包含英文字母的密碼', () => {
      expect(isValidPasswordFormat('a23456')).toBe(false);
      expect(isValidPasswordFormat('1b3456')).toBe(false);
      expect(isValidPasswordFormat('12345z')).toBe(false);
    });

    it('拒絕非數字字元', () => {
      expect(isValidPasswordFormat('12345!')).toBe(false);
      expect(isValidPasswordFormat('-12345')).toBe(false);
      expect(isValidPasswordFormat('1.2345')).toBe(false);
    });
  });

  describe('normalizePassword', () => {
    it('去除前後空白', () => {
      expect(normalizePassword('  123456  ')).toBe('123456');
      expect(normalizePassword('\t123456\n')).toBe('123456');
    });
  });

  describe('hashPassword', () => {
    it('相同密碼產生相同 hash', async () => {
      const h1 = await hashPassword('123456');
      const h2 = await hashPassword('123456');
      expect(h1).toBe(h2);
    });

    it('不同密碼產生不同 hash', async () => {
      const h1 = await hashPassword('123456');
      const h2 = await hashPassword('654321');
      expect(h1).not.toBe(h2);
    });

    it('hash 是 64 字元十六進位（SHA-256）', async () => {
      const h = await hashPassword('123456');
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it('拒絕格式錯誤的密碼', async () => {
      await expect(hashPassword('12345')).rejects.toThrow();
      await expect(hashPassword('abcdef')).rejects.toThrow();
      await expect(hashPassword('12345a')).rejects.toThrow();
    });

    it('自動 trim 空白', async () => {
      const h1 = await hashPassword('123456');
      const h2 = await hashPassword('  123456  ');
      expect(h1).toBe(h2);
    });
  });

  describe('verifyPassword', () => {
    it('正確密碼回 true', async () => {
      const hash = await hashPassword('123456');
      expect(await verifyPassword('123456', hash)).toBe(true);
    });

    it('錯誤密碼回 false', async () => {
      const hash = await hashPassword('123456');
      expect(await verifyPassword('654321', hash)).toBe(false);
      expect(await verifyPassword('000000', hash)).toBe(false);
    });
  });

  describe('PASSWORD_LENGTH', () => {
    it('是 6', () => {
      expect(PASSWORD_LENGTH).toBe(6);
    });
  });
});
