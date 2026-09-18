'use client';

import type { CompanyId, GameState } from '@/engine/types';

/**
 * Everything the player accumulates lives in localStorage for now: no backend,
 * no accounts. The shapes below are deliberately plain JSON so they can be
 * POSTed to a real service later without a migration.
 */
const PROFILE_KEY = 'dysms.profile.v1';
const PROGRESS_KEY = 'dysms.progress.v1';

export interface Profile {
  /** A display name, not an identity. Anyone can type anything. */
  name: string;
  since: number;
}

export interface Progress {
  version: 1;
  rounds: number;
  totalScore: number;
  totalHits: number;
  totalThrows: number;
  bestHit: number;
  best: Partial<Record<CompanyId, number>>;
  lastPlayed: number;
}

export const EMPTY_PROGRESS: Progress = {
  version: 1,
  rounds: 0,
  totalScore: 0,
  totalHits: 0,
  totalThrows: 0,
  bestHit: 0,
  best: {},
  lastPlayed: 0,
};

/** Private browsing, disabled storage and quota errors must never break play. */
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — the round still counts on screen.
  }
}

export function loadProfile(): Profile | null {
  const profile = read<Profile | null>(PROFILE_KEY, null);
  return profile && typeof profile.name === 'string' && profile.name.trim() ? profile : null;
}

export function saveProfile(name: string): Profile {
  const profile: Profile = { name: name.trim().slice(0, 24), since: Date.now() };
  write(PROFILE_KEY, profile);
  return profile;
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // nothing to do
  }
}

export function loadProgress(): Progress {
  return read<Progress>(PROGRESS_KEY, EMPTY_PROGRESS);
}

export interface RoundResult {
  progress: Progress;
  personalBest: boolean;
  previousBest: number;
}

export function recordRound(state: GameState): RoundResult {
  const progress = loadProgress();
  const companyId = state.company.id;
  const previousBest = progress.best[companyId] ?? 0;
  const personalBest = state.score > previousBest;

  const next: Progress = {
    ...progress,
    rounds: progress.rounds + 1,
    totalScore: progress.totalScore + state.score,
    totalHits: progress.totalHits + state.hits,
    totalThrows: progress.totalThrows + state.throws,
    bestHit: Math.max(progress.bestHit, state.bestHit),
    best: { ...progress.best, [companyId]: Math.max(previousBest, state.score) },
    lastPlayed: Date.now(),
  };
  write(PROGRESS_KEY, next);
  return { progress: next, personalBest, previousBest };
}

export function resetProgress(): void {
  write(PROGRESS_KEY, EMPTY_PROGRESS);
}
