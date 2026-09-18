'use client';

import { AMMO, AMMO_ORDER, GRID } from '@/engine/constants';
import { windAt } from '@/engine/physics';
import type { AmmoId, GameState } from '@/engine/types';
import { u } from './stage';

interface Props {
  state: GameState;
  onSelect: (ammo: AmmoId) => void;
}

function WindMeter({ value }: { value: number }) {
  const magnitude = Math.min(1, Math.abs(value) / 16);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-white/40">Air</span>
      <div className="relative h-1.5 w-24 rounded-full bg-white/10">
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
        <div
          className="absolute top-0 h-full rounded-full bg-sky-400"
          style={{
            left: value >= 0 ? '50%' : `${50 - magnitude * 50}%`,
            width: `${magnitude * 50}%`,
          }}
        />
      </div>
      <span className="w-14 text-[9px] tabular-nums text-white/50">
        {value >= 0 ? '→' : '←'} {Math.abs(value).toFixed(1)}
      </span>
    </div>
  );
}

export function Hud({ state, onSelect }: Props) {
  const wind = windAt(state.wind, state.t);

  return (
    <div
      className="pointer-events-none absolute flex flex-col justify-between rounded-md border border-edge bg-panel/70 px-3 py-2 backdrop-blur-sm"
      style={{ left: u(GRID.x), top: u(GRID.y + GRID.h + 1), width: u(GRID.w), height: u(7) }}
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
    </div>
  );
}
