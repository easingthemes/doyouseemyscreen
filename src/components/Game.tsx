'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AMMO, AMMO_ORDER, LAUNCH, STAGE_H, STAGE_W } from '@/engine/constants';
import { canThrow, selectAmmo, throwAmmo } from '@/engine/game';
import { powerFromDrag, previewPath, windAt } from '@/engine/physics';
import { useGame } from '@/hooks/useGame';
import type { AmmoId, CompanyId, GameState } from '@/engine/types';
import { recordRound, type Progress } from '@/lib/storage';
import { Hud } from './Hud';
import { MeetingWindow } from './MeetingWindow';
import { STAGE_PX_H, STAGE_PX_W, u } from './stage';

interface Props {
  companyId: CompanyId;
  seed: number;
  onFinished: (progress: Progress) => void;
  onExit: () => void;
  onRestart: () => void;
}

interface Aim {
  active: boolean;
  x: number;
  y: number;
}

export function Game({ companyId, seed, onFinished, onExit, onRestart }: Props) {
  const { stateRef, onFrame, force } = useGame(companyId, seed);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const aimRef = useRef<Aim>({ active: false, x: LAUNCH.x, y: LAUNCH.y - 20 });
  const resultRef = useRef<{ personalBest: boolean; previousBest: number } | null>(null);

  // Fit the fixed-size stage into whatever viewport we got.
  useEffect(() => {
    const fit = () => {
      const scale = Math.min(
        window.innerWidth / STAGE_PX_W,
        window.innerHeight / STAGE_PX_H,
      );
      scaleRef.current = scale;
      if (stageRef.current) {
        stageRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const toStage = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * STAGE_W,
      y: ((clientY - rect.top) / rect.height) * STAGE_H,
    };
  }, []);

  const draw = useCallback((state: GameState) => {
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as { __game?: GameState }).__game = state;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== STAGE_PX_W * dpr) {
      canvas.width = STAGE_PX_W * dpr;
      canvas.height = STAGE_PX_H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, STAGE_PX_W, STAGE_PX_H);

    // splats that missed everyone
    for (const splat of state.splats) {
      if (splat.targetId !== null) continue;
      const age = state.t - splat.bornAt;
      ctx.globalAlpha = Math.max(0, 0.75 - age / 8);
      ctx.fillStyle = AMMO[splat.ammo].color;
      ctx.beginPath();
      ctx.arc(u(splat.ax), u(splat.ay), u(splat.r) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // aim preview — only the first part of the arc, the rest is your problem
    const aim = aimRef.current;
    if (aim.active && canThrow(state)) {
      const vector = { x: aim.x - LAUNCH.x, y: aim.y - LAUNCH.y };
      const power = powerFromDrag(Math.hypot(vector.x, vector.y));
      const path = previewPath(
        state.selectedAmmo,
        vector,
        power,
        windAt(state.wind, state.t),
      );
      const shown = Math.floor(path.length * 0.4);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < shown; i += 3) {
        ctx.beginPath();
        ctx.arc(u(path[i].x), u(path[i].y), 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // power ring at the hand
      ctx.strokeStyle = `rgba(74,222,128,${0.3 + power * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(u(LAUNCH.x), u(LAUNCH.y), 9 + power * 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    // hand / launcher
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(u(LAUNCH.x), u(LAUNCH.y), 7, 0, Math.PI * 2);
    ctx.fill();

    // projectiles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const projectile of state.projectiles) {
      const def = AMMO[projectile.ammo];
      const size = u(def.radius) * 2.2;
      ctx.save();
      ctx.translate(u(projectile.pos.x), u(projectile.pos.y));
      ctx.rotate((state.t - projectile.bornAt) * 9 * (projectile.spin || 1));
      ctx.font = `${size}px serif`;
      ctx.fillText(def.emoji, 0, 0);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    onFrame((_dt, state) => {
      draw(state);
      // The round is written to storage exactly once, when the clock runs out.
      if (state.phase === 'over' && resultRef.current === null) {
        const result = recordRound(state);
        resultRef.current = {
          personalBest: result.personalBest,
          previousBest: result.previousBest,
        };
        onFinished(result.progress);
      }
    });
  }, [draw, onFinished, onFrame]);

  const release = useCallback(() => {
    const aim = aimRef.current;
    if (!aim.active) return;
    aim.active = false;
    const state = stateRef.current;
    const vector = { x: aim.x - LAUNCH.x, y: aim.y - LAUNCH.y };
    const distance = Math.hypot(vector.x, vector.y);
    if (distance < 2) return;
    throwAmmo(state, vector, powerFromDrag(distance));
    force();
  }, [force, stateRef]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < AMMO_ORDER.length) {
        selectAmmo(stateRef.current, AMMO_ORDER[index]);
        force();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [force, stateRef]);

  const state = stateRef.current;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0e0f12]">
      <div
        ref={stageRef}
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ width: STAGE_PX_W, height: STAGE_PX_H, transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-0 rounded-lg border border-edge bg-app" />

        <MeetingWindow state={state} />

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ width: STAGE_PX_W, height: STAGE_PX_H }}
        />

        {/* input surface */}
        <div
          className="absolute inset-0 z-20 cursor-crosshair"
          onPointerDown={(event) => {
            (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
            const point = toStage(event.clientX, event.clientY);
            aimRef.current = { active: true, x: point.x, y: point.y };
          }}
          onPointerMove={(event) => {
            if (!aimRef.current.active) return;
            const point = toStage(event.clientX, event.clientY);
            aimRef.current.x = point.x;
            aimRef.current.y = point.y;
          }}
          onPointerUp={release}
          onPointerCancel={release}
        />

        <div className="z-30">
          <Hud
            state={state}
            onSelect={(ammo: AmmoId) => {
              selectAmmo(stateRef.current, ammo);
              force();
            }}
          />
        </div>

        {state.phase === 'over' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 rounded-lg bg-black/90 backdrop-blur-sm">
            <div className="text-[13px] uppercase tracking-[0.35em] text-white/40">
              Meeting ended
            </div>
            <div className="text-[56px] font-semibold leading-none tabular-nums">
              {state.score.toLocaleString()}
            </div>
            <div className="text-[12px] text-white/55">
              {state.hits} hits from {state.throws} throws · best single hit {state.bestHit}
            </div>
            {resultRef.current?.personalBest ? (
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300">
                Personal best
                {resultRef.current.previousBest > 0
                  ? ` — beat ${resultRef.current.previousBest.toLocaleString()}`
                  : ''}
              </div>
            ) : (
              resultRef.current && (
                <div className="text-[11px] text-white/35">
                  Your best here: {resultRef.current.previousBest.toLocaleString()}
                </div>
              )
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="rounded bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-black"
              >
                Another meeting
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded border border-edge px-4 py-2 text-[12px] text-white/70"
              >
                Change company
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rotate-hint pointer-events-none absolute inset-0 z-50 flex-col items-center justify-center gap-3 bg-[#0e0f12] text-center">
        <div className="text-[28px]">📱↻</div>
        <div className="text-[14px] text-white/70">Turn your phone sideways</div>
        <div className="max-w-[240px] text-[11px] text-white/35">
          The meeting window needs the width.
        </div>
      </div>
    </div>
  );
}
