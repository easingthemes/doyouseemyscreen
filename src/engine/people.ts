import type { CompanyId, CompanyPreset, Participant } from './types';
import { AVATARS } from '../data/avatars';
import { pick, pickWeighted, nextRandom, chance } from './rng';

const FIRST = [
  'Ana', 'Marko', 'Priya', 'Tom', 'Lena', 'Ivan', 'Sofia', 'Dan', 'Mira', 'Jonas',
  'Elif', 'Pavel', 'Nora', 'Hugo', 'Katia', 'Milan', 'Yuki', 'Ben', 'Zara', 'Oskar',
  'Irena', 'Leo', 'Fatima', 'Nils', 'Vera', 'Andres', 'Tanja', 'Pete',
];

const LAST = [
  'K.', 'M.', 'Petrov', 'Hall', 'Nowak', 'Dias', 'Kim', 'Weber', 'Santos', 'Ilic',
  'Bakker', 'Rossi', 'Novak', 'Lund', 'Aziz', 'Moreau', 'Horvat', 'Berg',
];

export const COMPANIES: Record<CompanyId, CompanyPreset> = {
  startup: {
    id: 'startup',
    name: 'Seed-stage startup',
    blurb: 'Everyone talks at once. Tiles never stop moving.',
    speakerSwap: [2.2, 5],
    rosterChurn: [7, 14],
    cameraOffChance: 0.15,
    startSize: 6,
    maxSize: 12,
    roles: [
      { title: 'Founder / CEO', value: 500, weight: 1, speakiness: 5 },
      { title: 'CTO', value: 320, weight: 1, speakiness: 3 },
      { title: 'Growth Lead', value: 180, weight: 1.5, speakiness: 4 },
      { title: 'Designer', value: 110, weight: 2, speakiness: 2 },
      { title: 'Developer', value: 70, weight: 3, speakiness: 1.5 },
      { title: 'Intern', value: 10, weight: 2, speakiness: 0.6 },
    ],
  },
  corporate: {
    id: 'corporate',
    name: 'Enterprise all-hands',
    blurb: 'Big grid, small tiles, half the cameras are off.',
    speakerSwap: [5, 10],
    rosterChurn: [5, 11],
    cameraOffChance: 0.45,
    startSize: 10,
    maxSize: 20,
    roles: [
      { title: 'CEO', value: 500, weight: 0.6, speakiness: 4 },
      { title: 'COO', value: 400, weight: 0.8, speakiness: 3 },
      { title: 'CFO', value: 380, weight: 0.8, speakiness: 2 },
      { title: 'VP Sales', value: 240, weight: 1.2, speakiness: 4 },
      { title: 'HR Partner', value: 160, weight: 1.5, speakiness: 2 },
      { title: 'Compliance', value: 150, weight: 1, speakiness: 1 },
      { title: 'Project Manager', value: 120, weight: 2.5, speakiness: 3.5 },
      { title: 'Analyst', value: 60, weight: 2.5, speakiness: 1 },
      { title: 'Developer', value: 70, weight: 3, speakiness: 0.8 },
      { title: 'Intern', value: 10, weight: 2, speakiness: 0.4 },
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency client call',
    blurb: 'Someone is always sharing a screen. Targets get tiny.',
    speakerSwap: [3.5, 7],
    rosterChurn: [8, 16],
    cameraOffChance: 0.25,
    startSize: 7,
    maxSize: 14,
    roles: [
      { title: 'Client', value: 450, weight: 1, speakiness: 4 },
      { title: 'Creative Director', value: 300, weight: 1, speakiness: 3.5 },
      { title: 'Account Manager', value: 200, weight: 1.5, speakiness: 5 },
      { title: 'Copywriter', value: 90, weight: 2, speakiness: 1.5 },
      { title: 'Designer', value: 110, weight: 2, speakiness: 2 },
      { title: 'Developer', value: 70, weight: 2, speakiness: 1 },
      { title: 'Intern', value: 10, weight: 1.5, speakiness: 0.5 },
    ],
  },
};

export const COMPANY_LIST = [COMPANIES.startup, COMPANIES.corporate, COMPANIES.agency];

/** Hand out a face nobody in the call is already wearing, if one is free. */
function takeAvatar(state: { rngState: number }, used: Set<string>): string | null {
  if (AVATARS.length === 0) return null;
  const free = AVATARS.filter((file) => !used.has(file));
  const pool = free.length > 0 ? free : AVATARS;
  const chosen = pick(state, pool);
  used.add(chosen);
  return chosen;
}

export function makeParticipant(
  state: { rngState: number },
  company: CompanyPreset,
  at: number,
  taken: Set<string>,
  usedAvatars: Set<string> = new Set(),
): Participant {
  const role = pickWeighted(state, company.roles, (r) => r.weight);
  let name = `${pick(state, FIRST)} ${pick(state, LAST)}`;
  let guard = 0;
  while (taken.has(name) && guard++ < 20) {
    name = `${pick(state, FIRST)} ${pick(state, LAST)}`;
  }
  taken.add(name);
  return {
    id: `p${Math.floor(nextRandom(state) * 1e9).toString(36)}${at.toFixed(2)}`,
    name,
    title: role.title,
    value: role.value,
    speakiness: role.speakiness,
    cameraOn: !chance(state, company.cameraOffChance),
    hue: Math.floor(nextRandom(state) * 360),
    avatar: takeAvatar(state, usedAvatars),
    joinedAt: at,
    lastSpokeAt: -999,
    hits: 0,
  };
}
