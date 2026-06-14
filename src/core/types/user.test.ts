import { describe, it, expect } from 'vitest';
import {
  formatDefaultNickname,
  isDefaultNicknameFormat,
} from '../types/user';
import { validateNickname } from '../services/profileService';

describe('formatDefaultNickname', () => {
  it('zero-pads to at least 3 digits', () => {
    expect(formatDefaultNickname(1)).toBe('玩家001');
    expect(formatDefaultNickname(42)).toBe('玩家042');
    expect(formatDefaultNickname(123)).toBe('玩家123');
    expect(formatDefaultNickname(1234)).toBe('玩家1234');
  });
});

describe('isDefaultNicknameFormat', () => {
  it('accepts 玩家 + 3+ digits', () => {
    expect(isDefaultNicknameFormat('玩家001')).toBe(true);
    expect(isDefaultNicknameFormat('玩家123')).toBe(true);
    expect(isDefaultNicknameFormat('玩家99999')).toBe(true);
  });
  it('rejects custom nicknames', () => {
    expect(isDefaultNicknameFormat('小明')).toBe(false);
    expect(isDefaultNicknameFormat('玩家甲')).toBe(false);
    expect(isDefaultNicknameFormat('玩家01')).toBe(false);
    expect(isDefaultNicknameFormat('玩家abc')).toBe(false);
  });
});

describe('validateNickname', () => {
  it('rejects empty', () => {
    expect(validateNickname('').ok).toBe(false);
    expect(validateNickname('   ').ok).toBe(false);
  });
  it('rejects too short', () => {
    const r = validateNickname('a');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/至少/);
  });
  it('rejects too long', () => {
    const r = validateNickname('一二三四五六七八九十甲乙丙'); // 13 字
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/最多/);
  });
  it('trims whitespace', () => {
    const r = validateNickname('  小明  ');
    expect(r.ok).toBe(true);
    expect(r.trimmed).toBe('小明');
  });
  it('accepts valid nickname', () => {
    const r = validateNickname('小明');
    expect(r.ok).toBe(true);
    expect(r.trimmed).toBe('小明');
  });
  it('accepts exactly 12 chars', () => {
    const r = validateNickname('一二三四五六七八九十一二'); // 12 字
    expect(r.ok).toBe(true);
  });
});
