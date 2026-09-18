import type { AmmoDef, AmmoId } from './types';

/** Virtual stage. Everything is expressed in these units, then scaled to fit. */
export const STAGE_W = 100;
export const STAGE_H = 56.25;

/** Meeting window occupies the left part, roster panel the right. */
export const HEADER_H = 4.2;
export const ROSTER_X = 75.5;
export const ROSTER_W = STAGE_W - ROSTER_X - 1;
export const GRID = {
  x: 1,
  y: HEADER_H + 0.8,
  w: ROSTER_X - 2,
  h: 35,
};
/** The band under the meeting window holding the score bar and the chat. */
export const HUD = {
  y: GRID.y + GRID.h + 1,
  h: 7,
};
/** Free desk below the HUD — the player's hand lives here. */
export const DESK_Y = HUD.y + HUD.h + 0.5;

export const TILE_GAP = 0.8;
export const TILE_ASPECT = 16 / 9;

/**
 * Depth of the monitor from the player's hand. A throw only counts where it
 * reaches this plane — it does not collide with tiles it passes in front of.
 */
export const SCREEN_Z = 60;

/** Where the player's hand sits. */
export const LAUNCH: { x: number; y: number } = { x: GRID.x + GRID.w / 2, y: 52.5 };
export const GRAVITY = 12;
/** Depth cue: a projectile shrinks to this fraction as it reaches the screen. */
export const DEPTH_SCALE = 0.45;

export const ROUND_SECONDS = 180;

export const AMMO: Record<AmmoId, AmmoDef> = {
  paper: {
    id: 'paper',
    label: 'A4 ball',
    emoji: '📄',
    speed: 72,
    drag: 0.0035,
    sail: 1.2,
    radius: 0.9,
    multiplier: 1,
    sway: 0.05,
    curve: 0,
    splatRadius: 1.6,
    color: '#e8e4d8',
  },
  postit: {
    id: 'postit',
    label: 'Post-it wad',
    emoji: '🟨',
    speed: 76,
    drag: 0.0026,
    sail: 0.95,
    radius: 0.75,
    multiplier: 1.3,
    sway: 0.035,
    curve: 0,
    splatRadius: 1.3,
    color: '#f5d94a',
  },
  banana: {
    id: 'banana',
    label: 'Banana peel',
    emoji: '🍌',
    speed: 80,
    drag: 0.0018,
    sail: 0.6,
    radius: 1.1,
    multiplier: 1.7,
    sway: 0.03,
    curve: 18,
    splatRadius: 2.1,
    color: '#f2c744',
  },
  tomato: {
    id: 'tomato',
    label: 'Tomato',
    emoji: '🍅',
    speed: 86,
    drag: 0.001,
    sail: 0.35,
    radius: 1.35,
    multiplier: 2.2,
    sway: 0.018,
    curve: 0,
    splatRadius: 3.1,
    color: '#e5484d',
  },
  egg: {
    id: 'egg',
    label: 'Egg',
    emoji: '🥚',
    speed: 90,
    drag: 0.0008,
    sail: 0.22,
    radius: 1,
    multiplier: 2.6,
    sway: 0.012,
    curve: 0,
    splatRadius: 2.6,
    color: '#f7f2e4',
  },
};

export const AMMO_ORDER: AmmoId[] = ['paper', 'postit', 'banana', 'tomato', 'egg'];
