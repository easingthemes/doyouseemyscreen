/** All engine math runs in "stage units": a 100 x 56.25 virtual screen. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Projectiles fly *into* the screen: z is depth from the player to the call. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CompanyId = 'startup' | 'corporate' | 'agency';

export interface CompanyPreset {
  id: CompanyId;
  name: string;
  blurb: string;
  /** Seconds between speaker changes (min, max). */
  speakerSwap: [number, number];
  /** Seconds between someone joining or leaving (min, max). */
  rosterChurn: [number, number];
  /** Chance a participant keeps the camera off. */
  cameraOffChance: number;
  startSize: number;
  maxSize: number;
  roles: RoleTemplate[];
}

export interface RoleTemplate {
  title: string;
  /** Points a clean hit is worth. */
  value: number;
  /** Relative chance of being in the call. */
  weight: number;
  /** Relative chance of grabbing the floor. */
  speakiness: number;
}

export interface Participant {
  id: string;
  name: string;
  title: string;
  value: number;
  speakiness: number;
  cameraOn: boolean;
  /** Only meaningful for the player — everyone else is assumed muted. */
  micOn: boolean;
  /** You. Hittable, and in the participants list like everyone else. */
  isPlayer: boolean;
  /** Hue used for the placeholder avatar. */
  hue: number;
  /** Filename in public/avatars, or null when there is no image to give. */
  avatar: string | null;
  joinedAt: number;
  lastSpokeAt: number;
  hits: number;
}

export type AmmoId = 'paper' | 'postit' | 'banana' | 'tomato' | 'egg';

export interface AmmoDef {
  id: AmmoId;
  label: string;
  emoji: string;
  /** Launch speed at full power, stage units per second. */
  speed: number;
  /** Quadratic air resistance — how fast it bleeds speed. */
  drag: number;
  /** How much the office draft pushes it sideways. Paper sails, eggs do not. */
  sail: number;
  /** How hard it is to miss when this lands on somebody. */
  conspicuous: number;
  radius: number;
  /** Score multiplier on hit. */
  multiplier: number;
  /** Random aim error at release, radians. */
  sway: number;
  /** Sideways acceleration from spin — banana and friends curve. */
  curve: number;
  splatRadius: number;
  color: string;
}

export interface Projectile {
  id: number;
  ammo: AmmoId;
  pos: Vec3;
  vel: Vec3;
  spin: number;
  bornAt: number;
  /** Recent positions, newest last — drawn as a trail so the arc is readable. */
  trail: Vec3[];
}

export interface Splat {
  id: number;
  ammo: AmmoId;
  /** Tile the splat sticks to, or null when it landed on the wall. */
  targetId: string | null;
  /** Position inside the tile, 0..1 — so splats follow the grid reorder. */
  lx: number;
  ly: number;
  /** Absolute stage position, only used by wall splats. */
  ax: number;
  ay: number;
  r: number;
  bornAt: number;
}

/** Short-lived score popup left where a throw landed. */
export interface HitMark {
  id: number;
  x: number;
  y: number;
  points: number;
  bornAt: number;
}

export type EndReason = 'time' | 'caught';

export interface Wind {
  /** Steady draft from the AC vent. */
  base: number;
  /** Oscillating desk fan. */
  fanAmp: number;
  fanFreq: number;
  fanPhase: number;
  /** Short gust from a door opening, decays to zero. */
  gust: number;
  nextShiftAt: number;
}

export interface TileSlot {
  participantId: string;
  rect: Rect;
  /** Side strip tiles shrink while someone shares a screen. */
  compact: boolean;
}

export interface Layout {
  tiles: TileSlot[];
  presentation: Rect | null;
  stage: Rect;
}

export interface FeedEntry {
  id: number;
  t: number;
  text: string;
  kind: 'system' | 'chat' | 'hit';
}

export interface HitResult {
  participantId: string | null;
  points: number;
  label: string;
}

export interface GameState {
  seed: number;
  rngState: number;
  t: number;
  duration: number;
  phase: 'playing' | 'over';
  company: CompanyPreset;

  participants: Participant[];
  /** The player's own id — they are one of the participants. */
  playerId: string;
  suspicion: number;
  endReason: EndReason | null;
  speakerId: string | null;
  nextSpeakerAt: number;
  nextChurnAt: number;
  nextRefillAt: number;

  sharingId: string | null;
  nextShareAt: number;

  wind: Wind;
  projectiles: Projectile[];
  splats: Splat[];
  hitMarks: HitMark[];
  layout: Layout;

  inventory: Record<AmmoId, number>;
  selectedAmmo: AmmoId;
  nextDropAt: number;

  score: number;
  throws: number;
  hits: number;
  bestHit: number;
  feed: FeedEntry[];

  nextId: number;
}
