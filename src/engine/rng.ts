import type { GameState } from './types';

/** mulberry32 — small, fast, and seedable so runs stay reproducible. */
export function nextRandom(state: { rngState: number }): number {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(state: GameState | { rngState: number }, min: number, max: number): number {
  return min + nextRandom(state) * (max - min);
}

export function pick<T>(state: GameState | { rngState: number }, items: readonly T[]): T {
  return items[Math.floor(nextRandom(state) * items.length) % items.length];
}

export function chance(state: GameState | { rngState: number }, p: number): boolean {
  return nextRandom(state) < p;
}

/** Weighted pick — used for who joins the call and who grabs the floor. */
export function pickWeighted<T>(
  state: GameState | { rngState: number },
  items: readonly T[],
  weight: (item: T) => number,
): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return items[0];
  let roll = nextRandom(state) * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
