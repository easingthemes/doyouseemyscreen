'use client';

import { useState } from 'react';
import { Game } from '@/components/Game';
import { COMPANY_LIST } from '@/engine/people';
import type { CompanyId } from '@/engine/types';

export default function Home() {
  const [companyId, setCompanyId] = useState<CompanyId | null>(null);
  const [seed, setSeed] = useState(() => Date.now());

  if (companyId) {
    return (
      <Game
        key={`${companyId}-${seed}`}
        companyId={companyId}
        seed={seed}
        onExit={() => setCompanyId(null)}
        onRestart={() => setSeed(Date.now())}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-[34px] font-semibold tracking-tight">Do You See My Screen?</h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/50">
          Three minutes of a business call. Throw office supplies at the most expensive
          person on the grid. Tiles reorder while your paper ball is still in the air, and
          the office draft has opinions about where it lands.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {COMPANY_LIST.map((company) => (
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
            <div className="mt-3 text-[10px] uppercase tracking-wider text-white/30">
              {company.startSize}–{company.maxSize} people
            </div>
          </button>
        ))}
      </div>

      <div className="max-w-md text-center text-[11px] leading-relaxed text-white/35">
        Drag anywhere to aim — distance from your hand sets the power. Keys 1–5 pick ammo.
        Paper is free but the air owns it; eggs and tomatoes fly straight and score more.
      </div>
    </main>
  );
}
