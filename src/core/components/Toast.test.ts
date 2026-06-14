import { describe, it, expect } from 'vitest';
import { DEFAULT_DURATION_MS } from './Toast';

describe('Toast 系統常數', () => {
  it('預設 duration 為 4000ms（4 秒）', () => {
    expect(DEFAULT_DURATION_MS).toBe(4000);
  });
});
