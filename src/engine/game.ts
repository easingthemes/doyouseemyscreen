import { AMMO, GRID, LAUNCH, ROUND_SECONDS } from './constants';
import { computeLayout, easeLayout } from './layout';
import { COMPANIES, makeParticipant } from './people';
import {
  circleHitsRect,
  hasLanded,
  isOffStage,
  launchVelocity,
  stepProjectile,
  windAt,
} from './physics';
import { chance, nextRandom, pick, pickWeighted, range } from './rng';
import type {
  AmmoId,
  CompanyId,
  GameState,
  HitResult,
  Participant,
  Projectile,
  Vec3,
} from './types';

const BUZZ = [
  'can everyone see my screen?',
  "sorry, I was on mute",
  "let's take this offline",
  'quick question — is this recorded?',
  'circling back on the action items',
  'I have a hard stop at the top of the hour',
  "you're breaking up a bit",
  'can we get alignment on this?',
  'just to piggyback on that…',
  'let me share my screen real quick',
];

const DROP_TABLE: { ammo: AmmoId; weight: number; reason: string }[] = [
  { ammo: 'postit', weight: 3, reason: 'You found a Post-it block in the drawer' },
  { ammo: 'banana', weight: 2, reason: 'Leftover banana from breakfast' },
  { ammo: 'tomato', weight: 1.4, reason: 'Lunch arrived. Tomatoes included' },
  { ammo: 'egg', weight: 0.9, reason: 'Fridge raid: eggs' },
];

function mark(state: GameState, pos: Vec3, points: number) {
  state.hitMarks.push({ id: state.nextId++, x: pos.x, y: pos.y, points, bornAt: state.t });
}

function log(state: GameState, text: string, kind: 'system' | 'chat' | 'hit' = 'system') {
  state.feed.unshift({ id: state.nextId++, t: state.t, text, kind });
  if (state.feed.length > 40) state.feed.length = 40;
}

export function createGame(companyId: CompanyId, seed = Date.now()): GameState {
  const company = COMPANIES[companyId];
  const state: GameState = {
    seed,
    rngState: seed | 0,
    t: 0,
    duration: ROUND_SECONDS,
    phase: 'playing',
    company,
    participants: [],
    speakerId: null,
    nextSpeakerAt: 1.5,
    nextChurnAt: range({ rngState: seed | 0 }, ...company.rosterChurn),
    nextRefillAt: 0,
    sharingId: null,
    nextShareAt: 12,
    wind: {
      base: 0,
      fanAmp: 6,
      fanFreq: 0.55,
      fanPhase: 0,
      gust: 0,
      nextShiftAt: 10,
    },
    projectiles: [],
    splats: [],
    hitMarks: [],
    layout: { tiles: [], presentation: null, stage: { ...GRID } },
    inventory: { paper: Infinity, postit: 4, banana: 0, tomato: 0, egg: 0 },
    selectedAmmo: 'paper',
    nextDropAt: 14,
    score: 0,
    throws: 0,
    hits: 0,
    bestHit: 0,
    feed: [],
    nextId: 1,
  };

  const taken = new Set<string>();
  for (let i = 0; i < company.startSize; i++) {
    state.participants.push(makeParticipant(state, company, 0, taken));
  }
  state.wind.base = range(state, -7, 7);
  state.wind.fanPhase = range(state, 0, Math.PI * 2);
  state.layout = computeLayout(state.participants, state.speakerId, false);
  log(state, `${company.name}: meeting started. Nobody knows why.`);
  return state;
}

function takenNames(state: GameState): Set<string> {
  return new Set(state.participants.map((p) => p.name));
}

function pickSpeaker(state: GameState): Participant | null {
  const options = state.participants.filter((p) => p.id !== state.speakerId);
  if (options.length === 0) return null;
  return pickWeighted(state, options, (p) => p.speakiness);
}

function updateMeeting(state: GameState, dt: number) {
  // --- who has the floor -------------------------------------------------
  if (state.t >= state.nextSpeakerAt) {
    const speaker = pickSpeaker(state);
    if (speaker) {
      if (state.speakerId) {
        const prev = state.participants.find((p) => p.id === state.speakerId);
        if (prev) prev.lastSpokeAt = state.t;
      }
      state.speakerId = speaker.id;
      speaker.lastSpokeAt = state.t;
      if (chance(state, 0.35)) log(state, `${speaker.name}: ${pick(state, BUZZ)}`, 'chat');
    }
    state.nextSpeakerAt = state.t + range(state, ...state.company.speakerSwap);
  }

  // --- people joining and leaving ----------------------------------------
  // Knocked-out participants can drain the call faster than normal churn
  // refills it, so keep a floor: an empty grid is not a game.
  const floor = Math.max(4, state.company.startSize - 2);
  if (state.participants.length < floor && state.t >= state.nextRefillAt) {
    const person = makeParticipant(state, state.company, state.t, takenNames(state));
    state.participants.push(person);
    log(state, `${person.name} (${person.title}) joined.`);
    state.nextRefillAt = state.t + range(state, 1.2, 2.6);
  }

  if (state.t >= state.nextChurnAt) {
    const count = state.participants.length;
    const shouldJoin = count < state.company.startSize || (count < state.company.maxSize && chance(state, 0.6));
    if (shouldJoin) {
      const person = makeParticipant(state, state.company, state.t, takenNames(state));
      state.participants.push(person);
      log(state, `${person.name} (${person.title}) joined.`);
      // A door opening is a gust — it drags whatever is in the air sideways.
      state.wind.gust = range(state, -14, 14);
    } else if (count > 3) {
      const victim = pick(state, state.participants.filter((p) => p.id !== state.speakerId));
      removeParticipant(state, victim.id, `${victim.name} left the meeting.`);
    }
    state.nextChurnAt = state.t + range(state, ...state.company.rosterChurn);
  }

  // --- screen sharing -----------------------------------------------------
  if (state.t >= state.nextShareAt) {
    if (state.sharingId) {
      state.sharingId = null;
      log(state, 'Screen sharing stopped. Faces are big again.');
      state.nextShareAt = state.t + range(state, 14, 26);
    } else {
      const presenter = state.participants.find((p) => p.id === state.speakerId) ?? state.participants[0];
      if (presenter) {
        state.sharingId = presenter.id;
        log(state, `${presenter.name} is sharing a screen. Do you see my screen?`);
      }
      state.nextShareAt = state.t + range(state, 16, 30);
    }
  }

  // --- wind ---------------------------------------------------------------
  if (state.t >= state.wind.nextShiftAt) {
    state.wind.base = range(state, -9, 9);
    state.wind.fanAmp = range(state, 2, 9);
    state.wind.fanFreq = range(state, 0.35, 0.8);
    state.wind.nextShiftAt = state.t + range(state, 9, 18);
  }
  state.wind.gust *= Math.exp(-dt * 1.6);

  // --- ammo drops ---------------------------------------------------------
  if (state.t >= state.nextDropAt) {
    const drop = pickWeighted(state, DROP_TABLE, (d) => d.weight);
    const amount = 1 + Math.floor(nextRandom(state) * 3);
    state.inventory[drop.ammo] += amount;
    log(state, `${drop.reason} (+${amount} ${AMMO[drop.ammo].label}).`);
    state.nextDropAt = state.t + range(state, 15, 26);
  }
}

function removeParticipant(state: GameState, id: string, message: string) {
  state.participants = state.participants.filter((p) => p.id !== id);
  // Detach their splats onto the wall rather than deleting them, so the mess
  // does not blink out of existence the instant the target rage-quits.
  const slot = state.layout.tiles.find((tile) => tile.participantId === id);
  state.splats = state.splats.map((splat) =>
    splat.targetId === id
      ? {
          ...splat,
          targetId: null,
          bornAt: state.t,
          ax: slot ? slot.rect.x + splat.lx * slot.rect.w : splat.ax,
          ay: slot ? slot.rect.y + splat.ly * slot.rect.h : splat.ay,
        }
      : splat,
  );
  if (state.speakerId === id) state.speakerId = null;
  if (state.sharingId === id) state.sharingId = null;
  log(state, message);
}

function scoreHit(state: GameState, target: Participant, ammo: AmmoId, compact: boolean): HitResult {
  const def = AMMO[ammo];
  const speaking = state.speakerId === target.id;
  const tags: string[] = [];
  let points = target.value * def.multiplier;
  if (speaking) {
    points *= 2;
    tags.push('MID-SENTENCE x2');
  }
  if (!target.cameraOn) {
    points *= 0.5;
    tags.push('camera off x0.5');
  }
  if (compact) {
    points *= 1.5;
    tags.push('tiny tile x1.5');
  }
  const total = Math.round(points);
  return {
    participantId: target.id,
    points: total,
    label: tags.length ? tags.join(' · ') : 'clean hit',
  };
}

/**
 * Called once, where the throw reaches the screen. Because the test happens at
 * the screen plane only, a shot aimed at the top row is no longer intercepted
 * by the tiles it flew in front of on the way up.
 */
function resolveImpact(state: GameState, projectile: Projectile): void {
  const { layout } = state;
  const def = AMMO[projectile.ammo];

  for (const slot of layout.tiles) {
    if (!circleHitsRect(projectile.pos, def.radius, slot.rect)) continue;
    const target = state.participants.find((p) => p.id === slot.participantId);
    if (!target) continue;

    const result = scoreHit(state, target, projectile.ammo, slot.compact);
    state.score += result.points;
    state.hits += 1;
    state.bestHit = Math.max(state.bestHit, result.points);
    target.hits += 1;

    state.splats.push({
      id: state.nextId++,
      ammo: projectile.ammo,
      targetId: target.id,
      lx: (projectile.pos.x - slot.rect.x) / slot.rect.w,
      ly: (projectile.pos.y - slot.rect.y) / slot.rect.h,
      ax: projectile.pos.x,
      ay: projectile.pos.y,
      r: def.splatRadius,
      bornAt: state.t,
    });
    mark(state, projectile.pos, result.points);
    log(state, `HIT ${target.name} (${target.title}) +${result.points} — ${result.label}`, 'hit');

    if (target.hits >= 3) {
      removeParticipant(state, target.id, `${target.name}: "sorry, connection issues" — left.`);
      // A meeting refills fast. Somebody always takes the empty seat.
      state.nextChurnAt = Math.min(state.nextChurnAt, state.t + range(state, 1.5, 3.5));
      state.nextRefillAt = Math.min(state.nextRefillAt, state.t + range(state, 1, 2.2));
    } else if (target.cameraOn && chance(state, 0.4)) {
      target.cameraOn = false;
      log(state, `${target.name} turned the camera off.`, 'chat');
    }
    return;
  }

  if (layout.presentation && circleHitsRect(projectile.pos, def.radius, layout.presentation)) {
    state.score += 5;
    mark(state, projectile.pos, 5);
    if (chance(state, 0.25)) {
      log(state, 'You hit the slide deck. Nobody was going to read it anyway.', 'hit');
    }
  }

  // Missed everyone: it lands on the wall behind the call and fades.
  state.splats.push({
    id: state.nextId++,
    ammo: projectile.ammo,
    targetId: null,
    lx: 0,
    ly: 0,
    ax: projectile.pos.x,
    ay: projectile.pos.y,
    r: def.splatRadius * 0.8,
    bornAt: state.t,
  });
}

export function step(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  state.t += dt;
  if (state.t >= state.duration) {
    state.t = state.duration;
    state.phase = 'over';
    log(state, 'Meeting ended. Somehow it could have been an email.');
  }

  updateMeeting(state, dt);
  const target = computeLayout(state.participants, state.speakerId, Boolean(state.sharingId));
  state.layout = easeLayout(state.layout, target, dt);

  const windX = windAt(state.wind, state.t);
  const substeps = 4;
  const sub = dt / substeps;
  const survivors: Projectile[] = [];

  for (const projectile of state.projectiles) {
    let alive = true;
    for (let i = 0; i < substeps && alive; i++) {
      stepProjectile(projectile, sub, windX);
      if (hasLanded(projectile)) {
        resolveImpact(state, projectile);
        alive = false;
      } else if (isOffStage(projectile.pos)) {
        alive = false;
      }
    }
    if (alive) {
      projectile.trail.push({ ...projectile.pos });
      if (projectile.trail.length > 16) projectile.trail.shift();
      survivors.push(projectile);
    }
  }
  state.projectiles = survivors;

  // Splats stuck to a person stay for the round; the ones on the wall fade so
  // the room does not turn into soup.
  state.splats = state.splats.filter((s) => s.targetId !== null || state.t - s.bornAt < 6);
  state.hitMarks = state.hitMarks.filter((m) => state.t - m.bornAt < 2.2);
}

export function canThrow(state: GameState): boolean {
  return state.phase === 'playing' && state.inventory[state.selectedAmmo] > 0;
}

export function throwAmmo(state: GameState, aim: { x: number; y: number }): void {
  if (!canThrow(state)) return;
  const ammo = state.selectedAmmo;
  const vel = launchVelocity(aim, ammo, nextRandom(state), nextRandom(state));
  state.projectiles.push({
    id: state.nextId++,
    ammo,
    pos: { x: LAUNCH.x, y: LAUNCH.y, z: 0 },
    vel,
    spin: AMMO[ammo].curve ? (nextRandom(state) < 0.5 ? -1 : 1) : 0,
    bornAt: state.t,
    trail: [],
  });
  state.throws += 1;
  if (state.inventory[ammo] !== Infinity) {
    state.inventory[ammo] -= 1;
    if (state.inventory[ammo] <= 0) state.selectedAmmo = 'paper';
  }
}

export function selectAmmo(state: GameState, ammo: AmmoId): void {
  if (state.inventory[ammo] > 0) state.selectedAmmo = ammo;
}
