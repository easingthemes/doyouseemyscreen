'use client';

import { memo } from 'react';
import { AMMO } from '@/engine/constants';
import type { Participant, Splat, TileSlot } from '@/engine/types';
import { u } from './stage';

interface Props {
  slot: TileSlot;
  person: Participant;
  speaking: boolean;
  sharing: boolean;
  splats: Splat[];
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Tile({ slot, person, speaking, sharing, splats }: Props) {
  const { rect } = slot;
  const width = u(rect.w);
  const height = u(rect.h);

  return (
    <div
      className="absolute left-0 top-0 overflow-hidden rounded-[6px] border will-change-transform"
      style={{
        transform: `translate3d(${u(rect.x)}px, ${u(rect.y)}px, 0)`,
        width,
        height,
        backgroundColor: person.cameraOn ? `hsl(${person.hue} 28% 22%)` : '#191b20',
        borderColor: speaking ? '#4ade80' : '#383c46',
        borderWidth: speaking ? 2 : 1,
        boxShadow: speaking ? '0 0 18px rgba(74,222,128,0.35)' : 'none',
      }}
    >
      <div className="flex h-full w-full items-center justify-center">
        {person.cameraOn ? (
          <div
            className="flex items-center justify-center rounded-full font-semibold text-black/70"
            style={{
              width: height * 0.42,
              height: height * 0.42,
              fontSize: height * 0.16,
              backgroundColor: `hsl(${person.hue} 65% 62%)`,
            }}
          >
            {initials(person.name)}
          </div>
        ) : (
          <div className="text-center text-white/35" style={{ fontSize: height * 0.13 }}>
            {initials(person.name)}
            <div style={{ fontSize: height * 0.09 }}>camera off</div>
          </div>
        )}
      </div>

      {splats.map((splat) => (
        <div
          key={splat.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: splat.lx * width - u(splat.r) / 2,
            top: splat.ly * height - u(splat.r) / 2,
            width: u(splat.r),
            height: u(splat.r),
            backgroundColor: AMMO[splat.ammo].color,
            opacity: 0.85,
            boxShadow: `0 0 6px ${AMMO[splat.ammo].color}`,
          }}
        />
      ))}

      {!slot.compact ? (
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3">
          <span className="truncate text-[10px] font-medium leading-tight text-white/90">
            {person.name}
          </span>
          <span className="shrink-0 text-[9px] leading-tight text-white/45">{person.title}</span>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 truncate bg-black/55 px-1 text-[8px] leading-[12px] text-white/80">
          {person.name}
        </div>
      )}

      {sharing && (
        <div className="absolute left-1 top-1 rounded bg-emerald-500/80 px-1 text-[8px] font-semibold text-black">
          sharing
        </div>
      )}
    </div>
  );
}

/** Tiles re-render at 60Hz while sliding, so skip the ones that sit still. */
export const ParticipantTile = memo(Tile, (a, b) => {
  const ra = a.slot.rect;
  const rb = b.slot.rect;
  return (
    ra.x === rb.x &&
    ra.y === rb.y &&
    ra.w === rb.w &&
    ra.h === rb.h &&
    a.slot.compact === b.slot.compact &&
    a.speaking === b.speaking &&
    a.sharing === b.sharing &&
    a.person.cameraOn === b.person.cameraOn &&
    a.person.hits === b.person.hits &&
    a.splats.length === b.splats.length
  );
});
