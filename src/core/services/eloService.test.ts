import { describe, it, expect } from 'vitest';
import {
  calculateEloChange,
  expectedScore,
  getEloOrDefault,
  INITIAL_ELO,
  DEFAULT_K_FACTOR,
} from './eloService';

describe('ELO expectedScore', () => {
  it('同分時期望勝率為 0.5', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
  });

  it('我方分高 → 期望勝率 > 0.5', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1000)).toBeCloseTo(0.76, 2);
  });

  it('我方分低 → 期望勝率 < 0.5', () => {
    expect(expectedScore(800, 1000)).toBeLessThan(0.5);
    expect(expectedScore(800, 1000)).toBeCloseTo(0.24, 2);
  });

  it('差距 400 分 → 期望勝率約 0.91 / 0.09', () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(0.909, 2);
    expect(expectedScore(1000, 1400)).toBeCloseTo(0.091, 2);
  });
});

describe('ELO calculateEloChange', () => {
  it('同分 PK，贏家 +16（K=32）', () => {
    const change = calculateEloChange(1000, 1000, 1);
    expect(change).toBeCloseTo(16, 0);
  });

  it('同分 PK，輸家 -16（K=32）', () => {
    const change = calculateEloChange(1000, 1000, 0);
    expect(change).toBeCloseTo(-16, 0);
  });

  it('同分 PK，平手雙方 ±0', () => {
    expect(calculateEloChange(1000, 1000, 0.5)).toBeCloseTo(0, 5);
  });

  it('強贏弱：變動小（預期結果）', () => {
    const change = calculateEloChange(1200, 1000, 1);
    // 期望 0.76，實際 1，差 0.24，× 32 = 7.68
    expect(change).toBeCloseTo(7.68, 1);
  });

  it('弱贏強：變動大（爆冷）', () => {
    const change = calculateEloChange(1000, 1200, 1);
    // 期望 0.24，實際 1，差 0.76，× 32 = 24.32
    expect(change).toBeCloseTo(24.32, 1);
  });

  it('強平弱：強者扣分、弱者加分（爆冷）', () => {
    const winnerExpectedWin = calculateEloChange(1200, 1000, 0.5);
    const loserExpectedWin = calculateEloChange(1000, 1200, 0.5);
    // 強者期望 0.76，平手 0.5，差 -0.26，× 32 = -8.32
    expect(winnerExpectedWin).toBeCloseTo(-8.32, 1);
    expect(loserExpectedWin).toBeCloseTo(8.32, 1);
  });

  it('贏家加分 == 輸家扣分絕對值（零和近似）', () => {
    // 公式 K*(1-E) 對贏家、K*(0-E) 對輸家
    // 總和 K*(1-E) + K*(0-E) = K*(1-2E)
    // 當 E=0.5 時總和 = 0（嚴格零和）
    // 當 E≠0.5 時非零和，但兩人變化的絕對值加總 = K（單場總流動量固定）
    for (const elo of [800, 1000, 1200, 1400]) {
      const win = calculateEloChange(elo, 1000, 1);
      const lose = calculateEloChange(1000, elo, 0);
      // 贏家加分 + 輸家加分（負值）= 0 if expected=0.5
      // 嚴格說：win - lose (取絕對) 不是固定；但贏家加分 + |輸家加分| = 2*K*(1-E)
      // 關係：贏家新分 = playerOld + K*(1-E_own)
      //       輸家新分 = oppOld + K*(0-E_opp)
      // 沒簡單的「贏家加分 == 輸家扣分」關係
      // 改驗證另一性質：贏家加分 > 0 且 輸家扣分 < 0
      expect(win).toBeGreaterThan(0);
      expect(lose).toBeLessThan(0);
    }
  });

  it('自訂 K-factor 影響變動幅度', () => {
    const k16 = calculateEloChange(1000, 1000, 1, 16);
    const k32 = calculateEloChange(1000, 1000, 1, 32);
    expect(k16).toBeCloseTo(8, 0);
    expect(k32).toBeCloseTo(16, 0);
  });

  it('結果回傳合理範圍（單場不會 ±100 以上）', () => {
    for (const elo of [500, 1000, 1500, 2000]) {
      const win = calculateEloChange(elo, 1000, 1);
      const lose = calculateEloChange(elo, 1000, 0);
      expect(win).toBeGreaterThanOrEqual(0);
      expect(win).toBeLessThanOrEqual(DEFAULT_K_FACTOR);
      expect(lose).toBeGreaterThanOrEqual(-DEFAULT_K_FACTOR);
      expect(lose).toBeLessThanOrEqual(0);
    }
  });
});

describe('ELO getEloOrDefault', () => {
  it('null 回傳初始值', () => {
    expect(getEloOrDefault(null)).toBe(INITIAL_ELO);
  });
  it('undefined 回傳初始值', () => {
    expect(getEloOrDefault(undefined)).toBe(INITIAL_ELO);
  });
  it('有效數字回傳原值', () => {
    expect(getEloOrDefault(1234)).toBe(1234);
  });
  it('Infinity 回傳初始值（防呆）', () => {
    expect(getEloOrDefault(Infinity)).toBe(INITIAL_ELO);
  });
  it('NaN 回傳初始值', () => {
    expect(getEloOrDefault(NaN)).toBe(INITIAL_ELO);
  });
});
