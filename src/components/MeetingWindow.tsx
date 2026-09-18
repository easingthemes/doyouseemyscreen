'use client';

import { memo } from 'react';
import { GRID, HEADER_H, ROSTER } from '@/engine/constants';
import { orderParticipants } from '@/engine/layout';
import type { GameState, Participant } from '@/engine/types';
import { Chat } from './Chat';
import { ParticipantTile } from './ParticipantTile';
import { u } from './stage';

function clock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const Header = memo(function Header({
  title,
  count,
  remaining,
}: {
  title: string;
  count: number;
  remaining: number;
}) {
  return (
    <div
      className="absolute top-0 flex items-center justify-between rounded-t-md border-b border-edge bg-panel px-3"
      style={{ width: u(99), height: u(HEADER_H), left: u(0.5) }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="ml-2 text-[11px] text-white/60">{title} — weekly sync</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-white/60">
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">REC</span>
        <span>{count} participants</span>
        <span className="tabular-nums text-white/85">{clock(remaining)}</span>
      </div>
    </div>
  );
});

const Roster = memo(
  function Roster({ people, speakerId }: { people: Participant[]; speakerId: string | null }) {
    return (
      <div
        className="absolute flex flex-col overflow-hidden rounded-md border border-edge bg-panel"
        style={{ left: u(ROSTER.x), top: u(ROSTER.y), width: u(ROSTER.w), height: u(ROSTER.h) }}
      >
        <div className="border-b border-edge px-2 py-1 text-[9px] uppercase tracking-wider text-white/40">
          Participants <span className="text-white/25">{people.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
        {people.map((person) => (
          <div
            key={person.id}
            className="flex items-center justify-between gap-1 px-2 py-[3px] text-[9px]"
            style={{
              backgroundColor:
                speakerId === person.id ? 'rgba(74,222,128,0.12)' : 'transparent',
            }}
          >
            <span className="flex min-w-0 items-center gap-1">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(${person.hue} 65% 62%)` }}
              />
              <span className="truncate" style={{ color: person.isPlayer ? '#f0b429' : 'rgba(231,233,238,0.8)' }}>
                {person.name}
                {person.isPlayer ? ' (you)' : ''}
              </span>
            </span>
            <span className="shrink-0 text-white/35">{person.title}</span>
          </div>
        ))}
        </div>
      </div>
    );
  },
  (a, b) =>
    a.speakerId === b.speakerId &&
    a.people.length === b.people.length &&
    a.people.every(
      (p, i) => p.id === b.people[i].id && p.hits === b.people[i].hits && p.cameraOn === b.people[i].cameraOn,
    ),
);

const Presentation = memo(
  function Presentation({ presenter }: { presenter: string | null }) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/25">
        <div className="text-[13px] uppercase tracking-[0.3em]">Q3 Roadmap</div>
        <div className="text-[10px]">{presenter ? `${presenter} is presenting` : 'someone is presenting'}</div>
        <div className="mt-2 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-14 rounded-sm border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      </div>
    );
  },
  (a, b) => a.presenter === b.presenter,
);

export function MeetingWindow({
  state,
  webcam,
}: {
  state: GameState;
  webcam: MediaStream | null;
}) {
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const roster = orderParticipants(state.participants, state.speakerId);
  const presenter = state.sharingId ? (byId.get(state.sharingId)?.name ?? null) : null;

  return (
    <>
      <Header
        title={state.company.name}
        count={state.participants.length}
        remaining={state.duration - state.t}
      />

      {state.layout.presentation && (
        <div
          className="absolute left-0 top-0 overflow-hidden rounded-[6px] border border-edge bg-[#101318]"
          style={{
            transform: `translate3d(${u(state.layout.presentation.x)}px, ${u(state.layout.presentation.y)}px, 0)`,
            width: u(state.layout.presentation.w),
            height: u(state.layout.presentation.h),
          }}
        >
          <Presentation presenter={presenter} />
        </div>
      )}

      {state.layout.tiles.map((slot) => {
        const person = byId.get(slot.participantId);
        if (!person) return null;
        return (
          <ParticipantTile
            key={person.id}
            slot={slot}
            person={person}
            speaking={state.speakerId === person.id}
            sharing={state.sharingId === person.id}
            splats={state.splats.filter((s) => s.targetId === person.id)}
            webcam={person.isPlayer ? webcam : null}
          />
        );
      })}

      <Roster people={roster} speakerId={state.speakerId} />
      <Chat
        entries={state.feed}
        newestId={state.feed[0]?.id ?? 0}
        count={state.feed.length}
        playerName={byId.get(state.playerId)?.name ?? 'you'}
      />
    </>
  );
}
