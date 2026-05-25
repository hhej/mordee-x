'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Pill, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

export interface ChatStreamProps {
  messages: ChatMsg[];
  seededGreeting: string | null;
  isStreaming: boolean;
  consultEnded: boolean;
  streamError: string | null;

  inputText: string;
  setInputText: (t: string) => void;
  onSend: (text: string) => void | Promise<void>;

  /** Label shown above each user (sender) bubble. e.g. "คุณหมอ" on doctor side, persona name on patient side. */
  userLabel: string;
  /** Label shown above each assistant (other side) bubble. */
  assistantLabel: string;
  /** Placeholder shown in the textbox while the consult is active. */
  inputPlaceholder: string;
  /** Optional hint shown when there are no messages yet (and no seeded greeting). */
  emptyHint?: string;

  /**
   * Optional suggested-action chip rendered above the textbox.
   * Used on the doctor side to suggest inserting the prebaked Rx into the chat.
   * Pass `null` to hide the chip entirely.
   */
  suggestedAction?: {
    label: string;
    value: string;
    icon?: ReactNode;
    eyebrow?: string;
  } | null;
}

export function ChatStream({
  messages,
  seededGreeting,
  isStreaming,
  consultEnded,
  streamError,
  inputText,
  setInputText,
  onSend,
  userLabel,
  assistantLabel,
  inputPlaceholder,
  emptyHint = 'เริ่มการสนทนาด้วยการพิมพ์คำทักทาย…',
  suggestedAction = null,
}: ChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = async () => {
    if (!inputText.trim() || isStreaming || consultEnded) return;
    await onSend(inputText);
  };

  const hasContent = seededGreeting || messages.length > 0;

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-line/60 bg-white/60">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="บทสนทนากับแพทย์"
        className="flex-1 space-y-2.5 overflow-y-auto p-3"
      >
        {!hasContent ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            {emptyHint}
          </div>
        ) : (
          <>
            {seededGreeting ? (
              <Bubble
                msg={{ id: 'seed-greeting', role: 'assistant', content: seededGreeting }}
                streaming={false}
                userLabel={userLabel}
                assistantLabel={assistantLabel}
              />
            ) : null}
            {messages.map((m, i) => (
              <Bubble
                key={m.id}
                msg={m}
                streaming={isStreaming && i === messages.length - 1}
                userLabel={userLabel}
                assistantLabel={assistantLabel}
              />
            ))}
          </>
        )}
      </div>
      {streamError ? (
        <div className="border-t border-triage-red/30 bg-triage-red/10 px-3 py-1.5 text-[11px] text-triage-red">
          ⚠ {streamError}
        </div>
      ) : null}
      {suggestedAction && !consultEnded ? (
        <div className="flex items-center gap-2 border-t border-line/60 bg-mint-50/40 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-mint-700">
            <Sparkles className="size-3" />
            {suggestedAction.eyebrow ?? 'AI ช่วยเขียน'}
          </div>
          <button
            type="button"
            onClick={() => setInputText(suggestedAction.value)}
            disabled={isStreaming}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-mint-800 ring-1 ring-mint-300/60 transition-colors hover:bg-mint-100 disabled:opacity-50"
            title={suggestedAction.value}
          >
            {suggestedAction.icon ?? <Pill className="size-3" />}
            {suggestedAction.label}
          </button>
          {inputText ? (
            <button
              type="button"
              onClick={() => setInputText('')}
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-ink"
            >
              <X className="size-3" />
              ล้าง
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2 border-t border-line/60 p-2.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={consultEnded ? 'การปรึกษาสิ้นสุดแล้ว' : inputPlaceholder}
          disabled={isStreaming || consultEnded}
          className="flex-1 rounded-lg border border-line/70 bg-white/80 px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50 disabled:opacity-60"
        />
        <Button onClick={submit} disabled={!inputText.trim() || isStreaming || consultEnded} size="sm">
          <Send className="size-3.5" />
          ส่ง
        </Button>
      </div>
    </div>
  );
}

function Bubble({
  msg,
  streaming,
  userLabel,
  assistantLabel,
}: {
  msg: ChatMsg;
  streaming: boolean;
  userLabel: string;
  assistantLabel: string;
}) {
  const isUser = msg.role === 'user';
  const speaker = isUser ? userLabel : assistantLabel;
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        role="article"
        aria-label={speaker}
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'rounded-br-md bg-mint-600 text-white'
            : 'rounded-bl-md bg-slate-100 text-ink',
        )}
      >
        <div
          className={cn(
            'text-[10px] mb-0.5 font-medium uppercase tracking-wide',
            isUser ? 'text-mint-100' : 'text-muted-foreground',
          )}
        >
          {speaker}
        </div>
        {msg.content ? <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div> : null}
        {streaming && !msg.content ? (
          <div aria-hidden="true" className="flex gap-1 py-1">
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </div>
        ) : null}
        {streaming && msg.content ? (
          <span aria-hidden="true" className="ml-0.5 inline-block animate-pulse">▍</span>
        ) : null}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-current opacity-60"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
