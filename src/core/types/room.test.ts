import { describe, it, expect } from 'vitest';
import {
  isValidTurnTimeLimit,
  TURN_TIME_LIMITS,
  DEFAULT_TURN_TIME_LIMIT,
} from './room';

describe('isValidTurnTimeLimit', () => {
  it('accepts the eight allowed values', () => {
    expect(isValidTurnTimeLimit(15)).toBe(true);
    expect(isValidTurnTimeLimit(30)).toBe(true);
    expect(isValidTurnTimeLimit(45)).toBe(true);
    expect(isValidTurnTimeLimit(60)).toBe(true);
    expect(isValidTurnTimeLimit(90)).toBe(true);
    expect(isValidTurnTimeLimit(120)).toBe(true);
    expect(isValidTurnTimeLimit(150)).toBe(true);
    expect(isValidTurnTimeLimit(180)).toBe(true);
  });
  it('rejects other values', () => {
    expect(isValidTurnTimeLimit(10)).toBe(false);
    expect(isValidTurnTimeLimit(0)).toBe(false);
    expect(isValidTurnTimeLimit(300)).toBe(false);
    expect(isValidTurnTimeLimit('60')).toBe(false);
    expect(isValidTurnTimeLimit(null)).toBe(false);
  });
});

describe('TURN_TIME_LIMITS', () => {
  it('contains the eight allowed values in order', () => {
    expect(TURN_TIME_LIMITS).toEqual([15, 30, 45, 60, 90, 120, 150, 180]);
  });
  it('default is 30', () => {
    expect(DEFAULT_TURN_TIME_LIMIT).toBe(30);
  });
});
