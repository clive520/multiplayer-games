/**
 * AI 對手引擎（IMPROVEMENTS #9）
 *
 * 設計重點：
 * - AI 在 client-side 跑（瀏覽器端），零額外成本
 * - AI 是房間裡的「合成玩家」：uid 前綴 `ai-`，與真人共用 RoomPlayer 結構
 * - 每個遊戲各自實作 selectMove，介面統一為 AIEngine<State, MovePayload>
 * - difficulty 影響搜尋深度 / 隨機度 / 時間限制
 *
 * 與 GameDefinition 的關係：
 *   GameDefinition.aiEngine 是選填欄位；沒給就無法對戰電腦
 *   AI 自動下棋的觸發點在 GameRoom 的 useEffect，呼叫 gameDef.aiEngine.selectMove
 *   然後走一般的 submitMove pipeline
 */

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export const AI_DIFFICULTIES: ReadonlyArray<AIDifficulty> = ['easy', 'normal', 'hard'];

export const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
};

export const AI_DIFFICULTY_DESCRIPTION: Record<AIDifficulty, string> = {
  easy: '休閒隨性，適合新手熟悉玩法',
  normal: '有基礎判斷，會擋明顯威脅',
  hard: '深入搜尋，強度的對手',
};

/**
 * AI 思考延遲範圍：落子前隨機等待，模擬「正在想」的自然感
 * 範圍太短看起來像外掛；太長會讓對局拖泥帶水
 */
export const AI_THINK_DELAY_MIN_MS = 500;
export const AI_THINK_DELAY_MAX_MS = 1500;

export function pickAIThinkDelayMs(): number {
  return AI_THINK_DELAY_MIN_MS + Math.random() * (AI_THINK_DELAY_MAX_MS - AI_THINK_DELAY_MIN_MS);
}

/**
 * AI 玩家的 uid 前綴：用來辨識「這個玩家是 AI，不是真人」
 * 任何 `uid.startsWith('ai-')` 的 RoomPlayer 都視為 AI
 */
export const AI_PLAYER_UID_PREFIX = 'ai-';

export function makeAIPlayerUid(gameType: string, difficulty: AIDifficulty): string {
  return `${AI_PLAYER_UID_PREFIX}${gameType}-${difficulty}`;
}

export function isAIPlayerUid(uid: string): boolean {
  return uid.startsWith(AI_PLAYER_UID_PREFIX);
}

export function parseAIPlayerUid(
  uid: string,
): { gameType: string; difficulty: AIDifficulty } | null {
  if (!isAIPlayerUid(uid)) return null;
  const rest = uid.slice(AI_PLAYER_UID_PREFIX.length);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 0) return null;
  const gameType = rest.slice(0, lastDash);
  const diff = rest.slice(lastDash + 1) as AIDifficulty;
  if (!AI_DIFFICULTIES.includes(diff)) return null;
  return { gameType, difficulty: diff };
}

export function aiPlayerDisplayName(difficulty: AIDifficulty): string {
  return `AI 對手（${AI_DIFFICULTY_LABEL[difficulty]}）`;
}

/**
 * AI 引擎介面：每個遊戲各自實作 selectMove
 *
 * 泛型：
 * - TState：遊戲的 state 物件（從 GameEngine 拿）
 * - TMovePayload：submitMove 要的 payload 形狀
 *
 * 為什麼用泛型而不是 any：編譯期可以抓到 AI 回傳的 payload 跟遊戲不對的 bug
 * 但在 GameDefinition.aiEngine 欄位會用寬鬆型別以避免循環依賴
 */
export interface AIEngine<TState, TMovePayload> {
  readonly gameType: string;
  /**
   * 給定當前 state 與 AI 符號，回傳下一步 payload；無合法步時回傳 null
   * 注意：不要在裡面 mutate state；selectMove 應該是純函式
   */
  selectMove(state: TState, aiSymbol: 'X' | 'O', difficulty: AIDifficulty): TMovePayload | null;
}

/**
 * GameDefinition.aiEngine 用的寬鬆型別
 * 註冊時各遊戲會用具體泛型版本，registry 用寬鬆版以避免循環依賴
 */
export type AIEngineCreator = AIEngine<unknown, unknown>;

export function isAIEngine(value: unknown): value is AIEngineCreator {
  return (
    typeof value === 'object' &&
    value !== null &&
    'selectMove' in value &&
    typeof (value as { selectMove: unknown }).selectMove === 'function'
  );
}
