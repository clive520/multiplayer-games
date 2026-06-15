/**
 * ELO 評分系統（IMPROVEMENTS #10）
 *
 * 規則：
 * - 每個玩家每個遊戲有獨立 ELO，初始 1000
 * - 只在 PvP 對戰結算時更新（AI 房不算，避免灌水）
 * - K-factor 32（單場最大變動 ±32，新玩家變動大比較刺激）
 * - 公式來自經典 ELO（chess）：期望勝率 = 1 / (1 + 10^((對手分-自己分)/400))
 *
 * 例：
 *   同分 1000 vs 1000：期望勝率 0.5。贏 +16，輸 -16
 *   強 1200 vs 弱 1000：期望勝率 0.76。強贏 +8、弱贏 +24
 *   平手：1000 vs 1000 平手 → 雙方 ±0（合理：平手沒意外）
 *   平手：1200 vs 1000 平手 → 強者 -8、弱者 +8（爆冷）
 */

export const INITIAL_ELO = 1000;
export const DEFAULT_K_FACTOR = 32;
export const ELO_SCALE = 400; // 標準棋類 ELO 縮放

/** 對戰結果：贏=1、平=0.5、輸=0 */
export type EloOutcome = 1 | 0.5 | 0;

/** 期望勝率（0~1）：自己分高 → 接近 1；對手分高 → 接近 0 */
export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / ELO_SCALE));
}

/**
 * 計算單邊 ELO 變化量（正=加分，負=扣分）
 * 對戰結束後雙方各呼叫一次：贏家用 outcome=1、輸家用 outcome=0
 */
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  outcome: EloOutcome,
  kFactor: number = DEFAULT_K_FACTOR,
): number {
  const expected = expectedScore(playerElo, opponentElo);
  return kFactor * (outcome - expected);
}

/** 安全取得 ELO：沒值就回傳初始值（給舊用戶預設 1000） */
export function getEloOrDefault(elo: number | null | undefined): number {
  return typeof elo === 'number' && Number.isFinite(elo) ? elo : INITIAL_ELO;
}
