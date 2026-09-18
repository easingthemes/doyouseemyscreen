'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  AMMO,
  AMMO_ORDER,
  DEPTH_SCALE,
  DESK_Y,
  GRID,
  LAUNCH,
  ROSTER_X,
  SCREEN_Z,
  STAGE_H,
  STAGE_W,
} from '@/engine/constants';
import { canThrow, goLive, playerOf, selectAmmo, setCamera, setMic, throwAmmo } from '@/engine/game';
import { previewPath, windAt } from '@/engine/physics';
import { useGame } from '@/hooks/useGame';
import { useWebcam } from '@/hooks/useWebcam';
import type { AmmoId, CompanyId, GameState } from '@/engine/types';
import { recordRound, type Progress } from '@/lib/storage';
import { Callout } from './Callout';
import { Hud } from './Hud';
import { MeetingWindow } from './MeetingWindow';
import { STAGE_PX_H, STAGE_PX_W, u } from './stage';

interface Props {
  companyId: CompanyId;
  seed: number;
  playerName: string;
  useRealCamera: boolean;
  onFinished: (progress: Progress) => void;
  onExit: () => void;
  onRestart: () => void;
}

interface Aim {
  active: boolean;
  x: number;
  y: number;
}

export function Game({
  companyId,
  seed,
  playerName,
  useRealCamera,
  onFinished,
  onExit,
  onRestart,
}: Props) {
  const { stateRef, onFrame, force } = useGame(companyId, seed, playerName);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const aimRef = useRef<Aim>({ active: false, x: LAUNCH.x, y: LAUNCH.y - 20 });
  const resultRef = useRef<{ personalBest: boolean; previousBest: number } | null>(null);
  const { stream: webcam, status: webcamStatus, streamRef: webcamRef } = useWebcam(useRealCamera);
  const cameraWasOn = useRef<boolean | null>(null);

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

    // Aim preview: the first part of the flight only. The drop and the drift
    // past that point are the player's problem.
    const aim = aimRef.current;
    if (aim.active && canThrow(state)) {
      const path = previewPath(state.selectedAmmo, aim, windAt(state.wind, state.t));
      const shown = Math.max(2, Math.floor(path.length * 0.55));

      // Each dot gets its own dark rim: a single underlay stroke turned into a
      // grey smudge over bright tiles, and the far dots disappeared entirely.
      for (let i = 0; i < shown; i += 2) {
        const point = path[i];
        const fade = 1 - i / shown;
        const depth = 1 - (1 - DEPTH_SCALE) * (point.z / SCREEN_Z);
        const r = (2.6 + fade * 2.2) * (0.75 + 0.25 * depth);
        const x = u(point.x);
        const y = u(point.y);
        ctx.fillStyle = `rgba(0,0,0,${0.35 + fade * 0.25})`;
        ctx.beginPath();
        ctx.arc(x, y, r + 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.5 + fade * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crosshair on the spot being aimed at.
      const cx = u(aim.x);
      const cy = u(aim.y);
      ctx.strokeStyle = 'rgba(74,222,128,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();
    }

    // score popups from recent landings
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const hit of state.hitMarks) {
      const age = (state.t - hit.bornAt) / 2.2;
      const rise = age * 26;
      ctx.globalAlpha = Math.max(0, 1 - age * age);
      ctx.font = 'bold 20px ui-sans-serif, system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.fillStyle = hit.points >= 100 ? '#f0b429' : '#e7e9ee';
      const label = `+${hit.points}`;
      ctx.strokeText(label, u(hit.x), u(hit.y) - rise);
      ctx.fillText(label, u(hit.x), u(hit.y) - rise);
    }
    ctx.globalAlpha = 1;

    // projectiles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const projectile of state.projectiles) {
      const def = AMMO[projectile.ammo];

      // Trail behind the projectile, so the arc it is flying is readable.
      for (let i = 0; i < projectile.trail.length; i++) {
        const point = projectile.trail[i];
        const fade = (i + 1) / projectile.trail.length;
        const depth = 1 - (1 - DEPTH_SCALE) * (point.z / SCREEN_Z);
        ctx.fillStyle = `rgba(255,255,255,${0.06 + fade * 0.34})`;
        ctx.beginPath();
        ctx.arc(u(point.x), u(point.y), (1 + fade * 2.2) * depth, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shrinking with depth is the only cue that it is travelling away.
      const depth = 1 - (1 - DEPTH_SCALE) * (projectile.pos.z / SCREEN_Z);
      const size = u(def.radius) * 2.4 * depth;
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

      // Keep the real capture in step with the in-game camera, so "camera off"
      // actually stops capturing rather than just hiding the picture.
      const live = state.participants.find((p) => p.isPlayer)?.cameraOn ?? false;
      if (cameraWasOn.current !== live) {
        cameraWasOn.current = live;
        webcamRef.current?.getVideoTracks().forEach((track) => {
          track.enabled = live;
        });
      }

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
  }, [draw, onFinished, onFrame, webcamRef]);

  const release = useCallback(() => {
    const aim = aimRef.current;
    if (!aim.active) return;
    aim.active = false;
    throwAmmo(stateRef.current, { x: aim.x, y: aim.y });
    force();
  }, [force, stateRef]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const game = stateRef.current;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < AMMO_ORDER.length) {
        selectAmmo(game, AMMO_ORDER[index]);
      } else if (event.key === 'c' || event.key === 'C') {
        setCamera(game, !playerOf(game).cameraOn);
      } else if (event.key === 'm' || event.key === 'M') {
        setMic(game, !playerOf(game).micOn);
      } else if (event.key === ' ') {
        event.preventDefault();
        const live = playerOf(game).cameraOn && playerOf(game).micOn;
        goLive(game, !live);
      } else {
        return;
      }
      force();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [force, stateRef]);

  const state = stateRef.current;
  const me = playerOf(state);

  // Drags start here only. Once the pointer is captured it may travel anywhere,
  // so a heavy hold-over above the top row stays reachable.
  const aimZones = [
    {
      key: 'meeting',
      style: {
        left: 0,
        top: 0,
        width: u(ROSTER_X),
        height: u(GRID.y + GRID.h),
      },
    },
    {
      key: 'desk',
      style: {
        left: 0,
        top: u(DESK_Y),
        width: STAGE_PX_W,
        height: STAGE_PX_H - u(DESK_Y),
      },
    },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0e0f12]">
      <div
        ref={stageRef}
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ width: STAGE_PX_W, height: STAGE_PX_H, transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-0 rounded-lg border border-edge bg-app" />

        <MeetingWindow state={state} webcam={webcam} />

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ width: STAGE_PX_W, height: STAGE_PX_H }}
        />

        {/* Aim surfaces: the meeting window and the bare desk around the hand.
            The roster, chat and score bar are deliberately left out, so
            clicking an ammo button never starts a throw. */}
        {aimZones.map((zone) => (
          <div
            key={zone.key}
            className="absolute z-20 cursor-crosshair"
            style={zone.style}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture?.(event.pointerId);
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
        ))}

        <Hud
          state={state}
          me={me}
          onSelect={(ammo: AmmoId) => {
            selectAmmo(stateRef.current, ammo);
            force();
          }}
          onCamera={(on) => {
            setCamera(stateRef.current, on);
            force();
          }}
          onMic={(on) => {
            setMic(stateRef.current, on);
            force();
          }}
          webcamStatus={webcamStatus}
        />

        {state.callout && (
          <>
            <div
              className="pointer-events-none absolute z-20 rounded-md"
              style={{
                left: u(GRID.x - 0.4),
                top: u(GRID.y - 0.4),
                width: u(GRID.w + 0.8),
                height: u(GRID.h + 0.8),
                boxShadow: `inset 0 0 0 2px ${
                  state.callout.answeredAt ? 'rgba(74,222,128,0.5)' : 'rgba(240,180,41,0.75)'
                }`,
              }}
            />
            <Callout state={state} me={me} />
          </>
        )}

        {state.phase === 'over' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 rounded-lg bg-black/90 backdrop-blur-sm">
            <div
              className="text-[13px] uppercase tracking-[0.35em]"
              style={{ color: state.endReason === 'caught' ? '#e5484d' : 'rgba(255,255,255,0.4)' }}
            >
              {state.endReason === 'caught' ? 'You were caught' : 'Meeting ended'}
            </div>
            {state.endReason === 'caught' && (
              <div className="-mt-2 text-[11px] text-white/45">
                Removed from the call. HR will follow up.
              </div>
            )}
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
