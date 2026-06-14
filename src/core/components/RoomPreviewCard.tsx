import type { RoomSummary } from '../types/room';
import { TURN_TIME_LIMITS } from '../types/room';
import { BoardThumbnail } from './BoardThumbnail';
import type { GameDefinition } from '../types/game';

interface RoomPreviewCardProps {
  room: RoomSummary;
  gameDef: GameDefinition | undefined;
  /** 當前預覽的房間的 game state；若 undefined 表示尚未載入或無棋局 */
  gameState: { board?: ReadonlyArray<string> } | null;
}

/**
 * 大廳房間 hover 預覽卡片（IMPROVEMENTS #7）
 * 顯示在房間卡片下方，包含：玩家大頭貼、棋盤縮圖、更多房間資訊
 *
 * 注意：此元件假設被放在 absolute 定位的容器內（由 Lobby 控制）
 */
export function RoomPreviewCard({ room, gameDef, gameState }: RoomPreviewCardProps) {
  const turnTimeValid = TURN_TIME_LIMITS.includes(
    room.turnTimeLimitSec as (typeof TURN_TIME_LIMITS)[number]
  );
  return (
    <div
      role="tooltip"
      className="rounded-lg border border-slate-600 bg-slate-900 p-4 shadow-2xl"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* 左：房間資訊 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {gameDef?.icon && (
              <gameDef.icon className="h-6 w-6 text-slate-200" />
            )}
            <div>
              <h3 className="text-sm font-bold text-white">{gameDef?.name ?? room.gameType}</h3>
              {gameDef?.description && (
                <p className="text-xs text-slate-400">{gameDef.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-400">
            <div>
              房主：
              <span className="text-slate-200">{room.hostName}</span>
            </div>
            <div>
              玩家數：<span className="text-slate-200">
                {room.playerCount}/{room.maxPlayers}
              </span>
            </div>
            <div>
              每回合：<span className="text-slate-200">{room.turnTimeLimitSec} 秒</span>
              {gameDef?.estimatedDurationMin !== undefined && (
                <span className="ml-2 text-slate-500">
                  · 預計 {gameDef.estimatedDurationMin} 分鐘
                </span>
              )}
            </div>
            {turnTimeValid && <div className="text-[10px] text-slate-600">合法回合時間</div>}
            {room.spectatorCount > 0 && (
              <div className="text-blue-300">觀戰中：{room.spectatorCount} 人</div>
            )}
            <div className="text-[10px] text-slate-600">
              建立時間：
              {new Date(room.createdAt).toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        {/* 右：棋盤縮圖 */}
        {gameDef && room.status === 'playing' && (
          <div className="flex flex-col items-center gap-2">
            <BoardThumbnail
              gameType={room.gameType}
              board={gameState?.board}
              cellSize={room.gameType === 'reversi' ? 14 : 18}
            />
            <p className="text-[10px] text-slate-500">即時棋盤（進行中）</p>
          </div>
        )}
      </div>
    </div>
  );
}
