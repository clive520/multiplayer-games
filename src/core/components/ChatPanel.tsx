import { useEffect, useRef, useState, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage, subscribeChatMessages, validateChatText, type ChatMessage, CHAT_MAX_LENGTH } from '../services/chatService';

interface ChatPanelProps {
  roomId: string;
  currentUserId: string;
  currentNickname: string;
}

/**
 * 房間內聊天面板（IMPROVEMENTS #20）
 *
 * - 訂閱 RTDB 訂閱最近 50 則
 * - 自己的訊息靠右、對方靠左
 * - 自動捲動到底部（新訊息進來時）
 * - Enter 送出、Shift+Enter 換行（textarea）
 * - 送不出去時顯示錯誤（訊息太長、空訊息）
 */
export function ChatPanel({ roomId, currentUserId, currentNickname }: ChatPanelProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // 訂閱 RTDB 訊息
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeChatMessages(roomId, setMessages);
    return unsubscribe;
  }, [roomId]);

  // 自動捲動到底部
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      const validation = validateChatText(draft);
      if (!validation.ok) {
        setError(validation.reason === 'tooLong' ? t('chat.tooLong') : t('chat.emptyText'));
        return;
      }
      setError(null);
      setSending(true);
      try {
        await sendChatMessage(roomId, { uid: currentUserId, nickname: currentNickname, text: draft });
        setDraft('');
      } catch (err) {
        // 網路錯誤 / RTDB 規則拒絕
        console.error('送出聊天訊息失敗', err);
        setError(err instanceof Error ? err.message : t('chat.loadFailed'));
      } finally {
        setSending(false);
      }
    },
    [draft, roomId, currentUserId, currentNickname, t],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const remaining = CHAT_MAX_LENGTH - draft.length;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border dark:border-slate-700 border-app-border dark:bg-slate-800 bg-app-card">
      <header className="flex shrink-0 items-center justify-between border-b dark:border-slate-700 border-app-border px-4 py-2">
        <h2 className="text-sm font-semibold dark:text-slate-300 text-slate-700">
          💬 {t('chat.title')}
        </h2>
        <span className="text-xs dark:text-slate-500 text-slate-500">
          {messages.length}
        </span>
      </header>

      {/* 訊息列表（flex-1 撐滿中間） */}
      <div
        ref={listRef}
        className="flex-1 space-y-2 overflow-y-auto p-3 text-sm"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs dark:text-slate-500 text-slate-500">
            {t('chat.empty')}
          </p>
        ) : (
          messages.map((m) => {
            const isSelf = m.uid === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <span className="mb-0.5 px-1 text-xs dark:text-slate-500 text-slate-500">
                  {isSelf ? t('common.you') : m.nickname}
                </span>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 ${
                    isSelf
                      ? 'bg-blue-600 text-white'
                      : 'dark:bg-slate-700 bg-app-hover dark:text-slate-100 text-slate-800'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <p className="shrink-0 border-t dark:border-slate-700 border-app-border px-3 py-1 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* 輸入區（永遠在底部） */}
      <form
        onSubmit={handleSend}
        className="shrink-0 border-t dark:border-slate-700 border-app-border p-2"
      >
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          rows={2}
          maxLength={CHAT_MAX_LENGTH + 50}
          disabled={sending}
          className="w-full resize-none rounded border dark:border-slate-600 border-app-border-strong dark:bg-slate-900 bg-app-bg px-2 py-1.5 text-sm dark:text-white text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span
            className={`text-xs ${remaining < 0 ? 'text-red-400' : 'dark:text-slate-500 text-slate-500'}`}
          >
            {remaining < 0 ? t('chat.tooLong') : t('chat.inputHint')}
          </span>
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0 || remaining < 0}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {t('chat.send')}
          </button>
        </div>
      </form>
    </section>
  );
}
