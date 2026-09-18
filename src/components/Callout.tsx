'use client';

import { CALLOUT, GRID } from '@/engine/constants';
import type { GameState, Participant } from '@/engine/types';
import { u } from './stage';

/**
 * Someone has asked you something in front of the whole call. Camera and mic
 * on before the bar runs out, then hold it — and no throwing while you are live.
 */
export function Callout({ state, me }: { state: GameState; me: Participant }) {
  const callout = state.callout;
  if (!callout) return null;

  const answered = callout.answeredAt !== null;
  const remaining = answered
    ? Math.max(0, (callout.holdUntil ?? 0) - state.t)
    : Math.max(0, callout.deadline - state.t);
  const total = answered ? CALLOUT.hold : CALLOUT.window;
  const pct = (remaining / total) * 100;

  return (
    <div
      // Sits over the window chrome, not the grid: the top row is where the
      // expensive people are, and covering it mid-callout is unplayable.
      className="pointer-events-none absolute z-30 flex flex-col items-center gap-1 rounded-md border px-3 py-1.5 text-center backdrop-blur-sm"
      style={{
        left: u(GRID.x + GRID.w / 2 - 25),
        top: u(0.3),
        width: u(50),
        borderColor: answered ? '#4ade80' : '#f0b429',
        backgroundColor: answered ? 'rgba(20,40,28,0.92)' : 'rgba(46,36,10,0.92)',
      }}
    >
      <div className="truncate text-[11px] leading-tight text-white/90">
        <span className="font-medium">{callout.askerName}:</span> {me.name}, {callout.question}
      </div>
      <div className="text-[9px] leading-none" style={{ color: answered ? '#4ade80' : '#f0b429' }}>
        {answered
          ? 'Hold it — stay on until they move on'
          : me.cameraOn && !me.micOn
            ? 'You are on mute. Press M.'
            : 'Press space to go live'}
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: answered ? '#4ade80' : '#f0b429' }}
        />
      </div>
    </div>
  );
}
