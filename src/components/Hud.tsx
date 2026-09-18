'use client';

import { AMMO, AMMO_ORDER, GRID, HUD, SUSPICION } from '@/engine/constants';
import { windAt } from '@/engine/physics';
import type { AmmoId, GameState, Participant } from '@/engine/types';
import { u } from './stage';

interface Props {
  state: GameState;
  me: Participant;
  onSelect: (ammo: AmmoId) => void;
  onCamera: (on: boolean) => void;
  onMic: (on: boolean) => void;
}

function WindMeter({ value }: { value: number }) {
  const magnitude = Math.min(1, Math.abs(value) / 16);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-white/40">Air</span>
      <div className="relative h-1.5 w-20 rounded-full bg-white/10">
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
        <div
          className="absolute top-0 h-full rounded-full bg-sky-400"
          style={{
            left: value >= 0 ? '50%' : `${50 - magnitude * 50}%`,
            width: `${magnitude * 50}%`,
          }}
        />
      </div>
      <span className="w-12 text-[9px] tabular-nums text-white/50">
        {value >= 0 ? '→' : '←'} {Math.abs(value).toFixed(1)}
      </span>
    </div>
  );
}

function SuspicionMeter({ value }: { value: number }) {
  const pct = (value / SUSPICION.max) * 100;
  const colour = pct > 75 ? '#e5484d' : pct > 45 ? '#f0b429' : '#4ade80';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-white/40">Suspicion</span>
      <div className="relative h-2 w-32 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
      <span className="w-7 text-[9px] tabular-nums" style={{ color: colour }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

function Toggle({
  label,
  on,
  danger,
  onClick,
  hint,
}: {
  label: string;
  on: boolean;
  danger?: boolean;
  onClick: () => void;
  hint: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="pointer-events-auto flex items-center gap-1.5 rounded border px-2 py-1 text-[10px]"
      style={{
        borderColor: on ? (danger ? '#e5484d' : '#4ade80') : '#383c46',
        backgroundColor: on ? (danger ? 'rgba(229,72,77,0.15)' : 'rgba(74,222,128,0.12)') : 'rgba(255,255,255,0.02)',
        color: on ? '#fff' : 'rgba(255,255,255,0.55)',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: on ? (danger ? '#e5484d' : '#4ade80') : '#555b66' }}
      />
      {label} {on ? 'on' : 'off'}
      <span className="text-white/25">{hint}</span>
    </button>
  );
}

export function Hud({ state, me, onSelect, onCamera, onMic }: Props) {
  const wind = windAt(state.wind, state.t);
  const live = me.cameraOn || me.micOn;

  return (
    <div
      className="pointer-events-none absolute z-30 flex flex-col justify-between rounded-md border border-edge bg-panel/70 px-3 py-2 backdrop-blur-sm"
      style={{ left: u(GRID.x), top: u(HUD.y), width: u(GRID.w), height: u(HUD.h) }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-[18px] font-semibold tabular-nums leading-none">
            {state.score.toLocaleString()}
          </span>
          <span className="text-[10px] text-white/45">
            {state.hits}/{state.throws} hits · best {state.bestHit}
          </span>
        </div>
        <SuspicionMeter value={state.suspicion} />
        <WindMeter value={wind} />
      </div>

      <div className="flex items-center gap-1.5">
        {AMMO_ORDER.map((id, index) => {
          const def = AMMO[id];
          const count = state.inventory[id];
          const disabled = count <= 0;
          const active = state.selectedAmmo === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(id);
              }}
              className="pointer-events-auto flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] transition-colors disabled:opacity-25"
              style={{
                borderColor: active ? '#4ade80' : '#383c46',
                backgroundColor: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <span className="text-[12px]">{def.emoji}</span>
              <span className="text-white/75">{def.label}</span>
              <span className="tabular-nums text-white/40">
                {count === Infinity ? '∞' : count}
              </span>
              <span className="text-white/20">{index + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Toggle label="Camera" on={me.cameraOn} danger onClick={() => onCamera(!me.cameraOn)} hint="C" />
        <Toggle label="Mic" on={me.micOn} danger onClick={() => onMic(!me.micOn)} hint="M" />
        <span
          className="text-[10px]"
          style={{ color: live ? '#e5484d' : 'rgba(255,255,255,0.4)' }}
        >
          {live ? 'You are visible — hands must stay still' : 'Dark and muted. Throw away.'}
        </span>
        <span className="ml-auto text-[9px] text-white/25">space = go live / go dark</span>
      </div>
    </div>
  );
}
