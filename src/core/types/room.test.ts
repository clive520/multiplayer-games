import { describe, it, expect } from 'vitest';
import {
  isValidTurnTimeLimit,
  TURN_TIME_LIMITS,
  DEFAULT_TURN_TIME_LIMIT,
} from './room';

describe('isValidTurnTimeLimit', () => {
  it('accepts the four allowed values', () => {
    expect(isValidTurnTimeLimit(30)).toBe(true);
    expect(isValidTurnTimeLimit(60)).toBe(true);
    expect(isValidTurnTimeLimit(120)).toBe(true);
    expect(isValidTurnTimeLimit(150)).toBe(true);
  });
  it('rejects other values', () => {
    expect(isValidTurnTimeLimit(45)).toBe(false);
    expect(isValidTurnTimeLimit(0)).toBe(false);
    expect(isValidTurnTimeLimit(300)).toBe(false);
    expect(isValidTurnTimeLimit('60')).toBe(false);
    expect(isValidTurnTimeLimit(null)).toBe(false);
  });
});

describe('TURN_TIME_LIMITS', () => {
  it('contains the four allowed values', () => {
    expect(TURN_TIME_LIMITS).toEqual([30, 60, 120, 150]);
  });
  it('default is 30', () => {
    expect(DEFAULT_TURN_TIME_LIMIT).toBe(30);
  });
});
