import { describe, it, expect } from 'vitest';
import { validateChatText, CHAT_MAX_LENGTH, CHAT_MAX_DISPLAY } from './chatService';

describe('chatService', () => {
  describe('validateChatText', () => {
    it('空字串視為空訊息', () => {
      expect(validateChatText('')).toEqual({ ok: false, reason: 'empty' });
    });

    it('只有空白視為空訊息', () => {
      expect(validateChatText('   \n\t  ')).toEqual({ ok: false, reason: 'empty' });
    });

    it('非字串視為空訊息', () => {
      expect(validateChatText(null)).toEqual({ ok: false, reason: 'empty' });
      expect(validateChatText(undefined)).toEqual({ ok: false, reason: 'empty' });
      expect(validateChatText(123)).toEqual({ ok: false, reason: 'empty' });
    });

    it('1-200 字的字串通過', () => {
      expect(validateChatText('你好')).toEqual({ ok: true });
      expect(validateChatText('a')).toEqual({ ok: true });
      expect(validateChatText('a'.repeat(CHAT_MAX_LENGTH))).toEqual({ ok: true });
    });

    it('超過 200 字失敗', () => {
      expect(validateChatText('a'.repeat(CHAT_MAX_LENGTH + 1))).toEqual({
        ok: false,
        reason: 'tooLong',
      });
    });

    it('前後空白會被 trim 後計算長度', () => {
      // 200 字內容 + 空白 = trim 後 200 字 = 通過
      const padded = `   ${'x'.repeat(CHAT_MAX_LENGTH)}   `;
      expect(validateChatText(padded)).toEqual({ ok: true });
    });
  });

  describe('常數', () => {
    it('CHAT_MAX_LENGTH = 200', () => {
      expect(CHAT_MAX_LENGTH).toBe(200);
    });

    it('CHAT_MAX_DISPLAY = 50（訂閱時最多取 50 則）', () => {
      expect(CHAT_MAX_DISPLAY).toBe(50);
    });
  });
});
