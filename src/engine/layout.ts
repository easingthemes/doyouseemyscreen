import { GRID, TILE_ASPECT, TILE_GAP } from './constants';
import type { Layout, Participant, Rect, TileSlot } from './types';

/** How many faces stay visible in the filmstrip while a screen is shared. */
const STRIP_MAX = 6;
const STRIP_H = 8;

/**
 * Speaker first, then whoever spoke most recently, then by join time.
 * This ordering is the whole reason aiming is hard: it reshuffles mid-flight.
 */
export function orderParticipants(
  participants: Participant[],
  speakerId: string | null,
): Participant[] {
  return [...participants].sort((a, b) => {
    if (a.id === speakerId) return -1;
    if (b.id === speakerId) return 1;
    if (b.lastSpokeAt !== a.lastSpokeAt) return b.lastSpokeAt - a.lastSpokeAt;
    return a.joinedAt - b.joinedAt;
  });
}

/** Pick the column count that gives the largest 16:9 tile inside `area`. */
function bestColumns(area: Rect, count: number): { cols: number; tileW: number; tileH: number } {
  let best = { cols: 1, tileW: 0, tileH: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    let tileW = (area.w - TILE_GAP * (cols - 1)) / cols;
    let tileH = tileW / TILE_ASPECT;
    const maxH = (area.h - TILE_GAP * (rows - 1)) / rows;
    if (tileH > maxH) {
      tileH = maxH;
      tileW = tileH * TILE_ASPECT;
    }
    if (tileW <= 0 || tileH <= 0) continue;
    if (tileW * tileH > best.tileW * best.tileH) best = { cols, tileW, tileH };
  }
  return best;
}

function packGrid(area: Rect, people: Participant[]): TileSlot[] {
  if (people.length === 0) return [];
  const { cols, tileW, tileH } = bestColumns(area, people.length);
  const rows = Math.ceil(people.length / cols);
  const gridH = rows * tileH + (rows - 1) * TILE_GAP;
  const top = area.y + (area.h - gridH) / 2;

  return people.map((person, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Last row is centred, like every real meeting client does it.
    const inRow = Math.min(cols, people.length - row * cols);
    const rowW = inRow * tileW + (inRow - 1) * TILE_GAP;
    const left = area.x + (area.w - rowW) / 2;
    return {
      participantId: person.id,
      compact: tileW < 12,
      rect: {
        x: left + col * (tileW + TILE_GAP),
        y: top + row * (tileH + TILE_GAP),
        w: tileW,
        h: tileH,
      },
    };
  });
}

export function computeLayout(
  participants: Participant[],
  speakerId: string | null,
  sharing: boolean,
): Layout {
  const stage: Rect = { ...GRID };
  const ordered = orderParticipants(participants, speakerId);

  if (!sharing) {
    return { tiles: packGrid(stage, ordered), presentation: null, stage };
  }

  // Shared screen: the deck eats the room and faces drop into a bottom
  // filmstrip. Small targets, and every overshoot lands on the slides.
  const presentation: Rect = {
    x: stage.x,
    y: stage.y,
    w: stage.w,
    h: stage.h - STRIP_H - TILE_GAP,
  };
  const stripArea: Rect = {
    x: stage.x,
    y: presentation.y + presentation.h + TILE_GAP,
    w: stage.w,
    h: STRIP_H,
  };
  const visible = ordered.slice(0, STRIP_MAX);
  const tiles = packGrid(stripArea, visible).map((slot) => ({
    ...slot,
    compact: true,
  }));
  return { tiles, presentation, stage };
}

export function tileOf(layout: Layout, participantId: string): TileSlot | undefined {
  return layout.tiles.find((slot) => slot.participantId === participantId);
}

/**
 * Ease the rendered tiles toward the freshly computed target layout.
 *
 * The reorder animation lives in the engine on purpose: collision detection
 * then runs against the rect the player can actually see, so a shot that looks
 * like it lands on a sliding tile really does land on it.
 */
export function easeLayout(current: Layout, target: Layout, dt: number, speed = 11): Layout {
  const k = 1 - Math.exp(-dt * speed);
  const tiles = target.tiles.map((slot) => {
    const prev = current.tiles.find((t) => t.participantId === slot.participantId);
    if (!prev) return slot;
    const rect: Rect = {
      x: prev.rect.x + (slot.rect.x - prev.rect.x) * k,
      y: prev.rect.y + (slot.rect.y - prev.rect.y) * k,
      w: prev.rect.w + (slot.rect.w - prev.rect.w) * k,
      h: prev.rect.h + (slot.rect.h - prev.rect.h) * k,
    };
    return { ...slot, rect };
  });
  return { tiles, presentation: target.presentation, stage: target.stage };
}
