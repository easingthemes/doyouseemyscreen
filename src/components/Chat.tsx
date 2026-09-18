'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { CHAT } from '@/engine/constants';
import type { FeedEntry } from '@/engine/types';
import { u } from './stage';

const COLOURS: Record<FeedEntry['kind'], string> = {
  hit: '#f0b429',
  chat: 'rgba(231,233,238,0.72)',
  system: 'rgba(231,233,238,0.38)',
};

/** Within this many pixels of the bottom still counts as "following along". */
const STICK = 14;

interface Props {
  /** Newest-first, and mutated in place by the engine — never compare it by
   *  identity or by indexing into it, which always matches itself. */
  entries: FeedEntry[];
  /** Cheap primitives the memo below can actually tell apart. */
  newestId: number;
  count: number;
  playerName: string;
}

function ChatPanel({ entries, newestId, count, playerName }: Props) {
  // The engine keeps the feed newest-first; a chat reads oldest-first.
  const ordered = entries.slice(0, count).reverse();

  const scroller = useRef<HTMLDivElement | null>(null);
  const following = useRef(true);
  const seenId = useRef(0);
  const [unread, setUnread] = useState(0);
  const [mentions, setMentions] = useState(0);

  const markRead = useCallback(() => {
    seenId.current = newestId;
    setUnread(0);
    setMentions(0);
  }, [newestId]);

  const toBottom = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    following.current = true;
    markRead();
  }, [markRead]);

  // New lines arrived: follow them, or count them up if the player scrolled back.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (following.current) {
      el.scrollTop = el.scrollHeight;
      seenId.current = newestId;
      setUnread(0);
      setMentions(0);
      return;
    }
    const fresh = entries.filter((entry) => entry.id > seenId.current);
    setUnread(fresh.length);
    setMentions(fresh.filter((entry) => entry.mention).length);
  }, [newestId, count, entries]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICK;
    following.current = atBottom;
    if (atBottom) markRead();
  }, [markRead]);

  return (
    <div
      className="absolute z-30 flex flex-col overflow-hidden rounded-md border border-edge bg-panel/80"
      style={{ left: u(CHAT.x), top: u(CHAT.y), width: u(CHAT.w), height: u(CHAT.h) }}
    >
      <div className="flex items-center justify-between border-b border-edge px-2 py-1">
        <span className="text-[9px] uppercase tracking-wider text-white/40">Chat</span>
        {mentions > 0 && (
          <span className="rounded-full bg-amber-400 px-1.5 text-[9px] font-semibold leading-[14px] text-black">
            {mentions} @you
          </span>
        )}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        // The chat is inside the aim surface, so let it take its own drags.
        onPointerDown={(event) => event.stopPropagation()}
        className="pointer-events-auto flex-1 overflow-y-auto overscroll-contain px-2 py-1"
      >
        {ordered.map((entry) => {
          const isMention = Boolean(entry.mention);
          return (
            <div
              key={entry.id}
              className="mb-[3px] break-words text-[9px] leading-[12px]"
              style={{
                color: isMention ? '#ffd76a' : COLOURS[entry.kind],
                fontWeight: isMention ? 500 : 400,
              }}
            >
              {isMention && <span className="mr-1 text-amber-400">@</span>}
              {isMention ? entry.text.replace(`@${playerName}`, playerName) : entry.text}
            </div>
          );
        })}
      </div>

      {unread > 0 && (
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            toBottom();
          }}
          className="pointer-events-auto m-1 rounded bg-white/10 py-0.5 text-[9px] text-white/75 hover:bg-white/15"
        >
          {unread} new{mentions > 0 ? ` · ${mentions} @you` : ''} ↓
        </button>
      )}
    </div>
  );
}

export const Chat = memo(
  ChatPanel,
  (a, b) => a.playerName === b.playerName && a.newestId === b.newestId && a.count === b.count,
);
