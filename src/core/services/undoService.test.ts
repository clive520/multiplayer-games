import { describe, it, expect } from 'vitest';
import {
  isUndoRequestTimedOut,
  UNDO_REQUEST_TIMEOUT_MS,
} from './undoService';

describe('undoService', () => {
  describe('isUndoRequestTimedOut', () => {
    it('剛建立的請求不算超時', () => {
      const req = { requesterUid: 'a', requesterNickname: 'A', targetMoveIndex: 0, createdAt: Date.now() };
      expect(isUndoRequestTimedOut(req)).toBe(false);
    });

    it('超過 30 秒的請求算超時', () => {
      const req = {
        requesterUid: 'a',
        requesterNickname: 'A',
        targetMoveIndex: 0,
        createdAt: Date.now() - UNDO_REQUEST_TIMEOUT_MS - 1,
      };
      expect(isUndoRequestTimedOut(req)).toBe(true);
    });

    it('剛好 30 秒的請求（邊界）不算超時（嚴格大於）', () => {
      const req = {
        requesterUid: 'a',
        requesterNickname: 'A',
        targetMoveIndex: 0,
        createdAt: Date.now() - UNDO_REQUEST_TIMEOUT_MS,
      };
      expect(isUndoRequestTimedOut(req)).toBe(false);
    });

    it('傳入 now 參數正確判斷', () => {
      const req = { requesterUid: 'a', requesterNickname: 'A', targetMoveIndex: 0, createdAt: 1000 };
      expect(isUndoRequestTimedOut(req, 1000 + UNDO_REQUEST_TIMEOUT_MS)).toBe(false);
      expect(isUndoRequestTimedOut(req, 1000 + UNDO_REQUEST_TIMEOUT_MS + 1)).toBe(true);
    });
  });

  describe('常數', () => {
    it('UNDO_REQUEST_TIMEOUT_MS = 30 秒', () => {
      expect(UNDO_REQUEST_TIMEOUT_MS).toBe(30_000);
    });
  });
});
