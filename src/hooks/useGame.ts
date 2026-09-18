'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createGame, step } from '@/engine/game';
import type { CompanyId, GameState } from '@/engine/types';

const MAX_FRAME = 1 / 20;
/** Tiles slide every frame, so React renders every frame; the pieces that do
 * not move are memoised instead. */
const UI_INTERVAL = 0;

export function useGame(companyId: CompanyId, seed: number) {
  const stateRef = useRef<GameState>(null as unknown as GameState);
  if (stateRef.current === null) stateRef.current = createGame(companyId, seed);

  const [, force] = useReducer((n: number) => n + 1, 0);
  const frameRef = useRef<((dt: number, state: GameState) => void) | null>(null);

  const onFrame = useCallback((fn: (dt: number, state: GameState) => void) => {
    frameRef.current = fn;
  }, []);

  useEffect(() => {
    stateRef.current = createGame(companyId, seed);
    force();
  }, [companyId, seed]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;

    const loop = (now: number) => {
      const dt = Math.min(MAX_FRAME, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      step(state, dt);
      frameRef.current?.(dt, state);

      uiAcc += dt;
      if (uiAcc >= UI_INTERVAL) {
        uiAcc = 0;
        force();
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { stateRef, onFrame, force };
}
