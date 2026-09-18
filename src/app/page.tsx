'use client';

import { useEffect, useState } from 'react';
import { Game } from '@/components/Game';
import { COMPANY_LIST } from '@/engine/people';
import type { CompanyId } from '@/engine/types';
import {
  clearProfile,
  EMPTY_PROGRESS,
  loadProfile,
  loadProgress,
  resetProgress,
  saveProfile,
  type Profile,
  type Progress,
} from '@/lib/storage';

function NameGate({ onDone }: { onDone: (profile: Profile) => void }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-[32px] font-semibold tracking-tight">Do You See My Screen?</h1>
        <p className="mt-2 text-[13px] text-white/50">Pick a name for the scoreboard.</p>
      </div>
      <form
        className="flex w-full max-w-sm gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) onDone(saveProfile(trimmed));
        }}
      >
        <input
          autoFocus
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
          placeholder="your name"
          className="min-w-0 flex-1 rounded border border-edge bg-panel px-3 py-2 text-[14px] outline-none focus:border-emerald-500/60"
        />
        <button
          type="submit"
          disabled={!trimmed}
          className="rounded bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-30"
        >
          Join
        </button>
      </form>
      <p className="max-w-sm text-center text-[11px] leading-relaxed text-white/30">
        No account, no password. The name and your scores are stored in this browser
        only — clear site data and they are gone.
      </p>
    </main>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [companyId, setCompanyId] = useState<CompanyId | null>(null);
  const [seed, setSeed] = useState(0);

  // localStorage is only available in the browser, so read it after mount.
  useEffect(() => {
    setProfile(loadProfile());
    setProgress(loadProgress());
    setReady(true);
  }, []);

  if (!ready) return <main className="min-h-screen" />;
  if (!profile) return <NameGate onDone={setProfile} />;

  if (companyId) {
    return (
      <Game
        key={`${companyId}-${seed}`}
        companyId={companyId}
        seed={seed}
        onFinished={setProgress}
        onExit={() => setCompanyId(null)}
        onRestart={() => setSeed(Date.now())}
      />
    );
  }

  const accuracy = progress.totalThrows
    ? Math.round((progress.totalHits / progress.totalThrows) * 100)
    : 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 p-6">
      <div className="text-center">
        <h1 className="text-[34px] font-semibold tracking-tight">Do You See My Screen?</h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/50">
          Three minutes of a business call. Throw office supplies at the most expensive
          person on the grid. Tiles reorder while your paper ball is still in the air, and
          the office draft has opinions about where it lands.
        </p>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-white/45">
        <span className="text-white/75">{profile.name}</span>
        <span className="text-white/20">·</span>
        <span>{progress.rounds} meetings</span>
        <span className="text-white/20">·</span>
        <span>{accuracy}% accuracy</span>
        <span className="text-white/20">·</span>
        <span>best hit {progress.bestHit}</span>
        <button
          type="button"
          onClick={() => {
            clearProfile();
            setProfile(null);
          }}
          className="ml-1 underline decoration-white/20 underline-offset-2 hover:text-white/70"
        >
          change name
        </button>
      </div>

      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {COMPANY_LIST.map((company) => {
          const best = progress.best[company.id] ?? 0;
          return (
            <button
              key={company.id}
              type="button"
              onClick={() => {
                setSeed(Date.now());
                setCompanyId(company.id);
              }}
              className="rounded-lg border border-edge bg-panel p-4 text-left transition-colors hover:border-emerald-500/60"
            >
              <div className="text-[14px] font-medium">{company.name}</div>
              <div className="mt-1 text-[11px] leading-snug text-white/45">{company.blurb}</div>
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/30">
                <span>
                  {company.startSize}–{company.maxSize} people
                </span>
                <span className={best ? 'text-emerald-400/80' : ''}>
                  {best ? `best ${best.toLocaleString()}` : 'unplayed'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="max-w-md text-center text-[11px] leading-relaxed text-white/35">
          Drag anywhere to aim — distance from your hand sets the power. Keys 1–5 pick ammo.
          Paper is free but the air owns it; eggs and tomatoes fly straight and score more.
        </p>
        {progress.rounds > 0 && (
          <button
            type="button"
            onClick={() => {
              resetProgress();
              setProgress(EMPTY_PROGRESS);
            }}
            className="text-[10px] text-white/25 underline decoration-white/15 underline-offset-2 hover:text-white/50"
          >
            reset progress
          </button>
        )}
      </div>
    </main>
  );
}
