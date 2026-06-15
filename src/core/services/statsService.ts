import { doc, setDoc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { GameType } from '../types/room';
import { calculateEloChange, getEloOrDefault, INITIAL_ELO, type EloOutcome } from './eloService';

export interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  /** ELO 評分（IMPROVEMENTS #10）；預設 1000，只在 PvP 結算時更新 */
  elo: number;
}

export const DEFAULT_GAME_STATS: GameStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  totalGames: 0,
  elo: INITIAL_ELO,
};

export interface UserStats {
  uid: string;
  nickname: string;
  displayName: string;
  photoURL: string | null;
  overall: GameStats;
  byGame: {
    tictactoe: GameStats;
    gomoku: GameStats;
    reversi: GameStats;
  };
  updatedAt: number;
}

export interface LeaderboardEntry extends UserStats {
  winRate: number;
}

export function getGameStats(user: UserStats, gameType: GameType | 'overall'): GameStats {
  if (gameType === 'overall') return user.overall ?? DEFAULT_GAME_STATS;
  return user.byGame?.[gameType] ?? DEFAULT_GAME_STATS;
}

export function calculateWinRate(stats: GameStats): number {
  if (stats.totalGames === 0) return 0;
  return Math.round((stats.wins / stats.totalGames) * 100);
}

function emptyByGame(): UserStats['byGame'] {
  return {
    tictactoe: { ...DEFAULT_GAME_STATS },
    gomoku: { ...DEFAULT_GAME_STATS },
    reversi: { ...DEFAULT_GAME_STATS },
  };
}

export async function ensureUserStats(_uid: string): Promise<void> {
  // 此函式保留供向後相容；新巢狀結構下 recordGameResult 會自動建立文件
}

export async function recordGameResult(args: {
  gameType: GameType;
  winnerId: string | null;
  isDraw: boolean;
  players: Array<{ uid: string; nickname: string; photoURL: string | null }>;
  /**
   * 是否為對戰電腦房。true → 只動 wins/losses，不算 ELO（避免 AI 灌水）
   * （IMPROVEMENTS #10：ELO 只反映 PvP 真實對戰強度）
   */
  isAIRoom?: boolean;
}): Promise<void> {
  const { gameType, winnerId, isDraw, players, isAIRoom = false } = args;
  const now = Date.now();

  // PvP 時計算 ELO 變化：先讀雙方目前 ELO，再用公式算新分
  // 注意：此 read+write 不 atomic（client 端），
  // 極小機率同時多場時 ELO 會略不準，MVP 可接受
  const eloByPlayer = new Map<string, number>();
  if (!isAIRoom) {
    await Promise.all(
      players.map(async (p) => {
        const ref = doc(db, 'users', p.uid);
        const snap = await getDoc(ref);
        const existingElo = snap.exists()
          ? (snap.data() as { byGame?: { [k: string]: { elo?: number } } })
              .byGame?.[gameType]?.elo
          : undefined;
        eloByPlayer.set(p.uid, getEloOrDefault(existingElo));
      })
    );
  }

  const updates = players.map((p) => {
    const ref = doc(db, 'users', p.uid);
    const isWinner = !isDraw && p.uid === winnerId;
    const delta = isDraw
      ? { wins: 0, losses: 0, draws: 1, totalGames: 1 }
      : isWinner
        ? { wins: 1, losses: 0, draws: 0, totalGames: 1 }
        : { wins: 0, losses: 1, draws: 0, totalGames: 1 };

    const updates: Record<string, unknown> = {
      'overall.wins': increment(delta.wins),
      'overall.losses': increment(delta.losses),
      'overall.draws': increment(delta.draws),
      'overall.totalGames': increment(delta.totalGames),
      [`byGame.${gameType}.wins`]: increment(delta.wins),
      [`byGame.${gameType}.losses`]: increment(delta.losses),
      [`byGame.${gameType}.draws`]: increment(delta.draws),
      [`byGame.${gameType}.totalGames`]: increment(delta.totalGames),
      nickname: p.nickname,
      displayName: p.nickname,
      photoURL: p.photoURL,
      updatedAt: now,
    };

    // ELO：PvP 兩人局時計算、AI 房跳過
    if (!isAIRoom && players.length === 2) {
      const opp = players.find((o) => o.uid !== p.uid);
      if (opp) {
        const myElo = eloByPlayer.get(p.uid) ?? INITIAL_ELO;
        const oppElo = eloByPlayer.get(opp.uid) ?? INITIAL_ELO;
        const outcome: EloOutcome = isDraw ? 0.5 : isWinner ? 1 : 0;
        const eloChange = calculateEloChange(myElo, oppElo, outcome);
        // 用 set（直接寫絕對值），因為 ELO 變化是基於當下讀到的舊值算的
        updates[`byGame.${gameType}.elo`] = Math.round(myElo + eloChange);
      }
    }

    return updateDoc(ref, updates).catch(async (err) => {
      if (err.code === 'not-found') {
        // 第一次玩此遊戲，建立使用者文件（含完整初始結構）
        const initial: any = {
          uid: p.uid,
          nickname: p.nickname,
          displayName: p.nickname,
          photoURL: p.photoURL,
          isCustomNickname: false,
          overall: { ...DEFAULT_GAME_STATS },
          byGame: emptyByGame(),
          createdAt: serverTimestamp(),
          updatedAt: now,
        };
        initial.overall.wins = delta.wins;
        initial.overall.losses = delta.losses;
        initial.overall.draws = delta.draws;
        initial.overall.totalGames = delta.totalGames;
        const gameEntry: GameStats = { ...delta, elo: INITIAL_ELO };
        initial.byGame[gameType] = gameEntry;
        await setDoc(ref, initial);
      } else {
        throw err;
      }
    });
  });
  await Promise.all(updates);
}
