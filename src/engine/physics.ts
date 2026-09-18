import { AMMO, GRAVITY, LAUNCH, MAX_DRAG, MIN_POWER, STAGE_H, STAGE_W } from './constants';
import type { AmmoId, Projectile, Rect, Vec2, Wind } from './types';

export function windAt(wind: Wind, t: number): number {
  return wind.base + wind.fanAmp * Math.sin(t * wind.fanFreq + wind.fanPhase) + wind.gust;
}

/**
 * Gravity, quadratic air resistance, a sideways push from the office draft and
 * spin for the things that curve. Wind uses its own `sail` factor rather than
 * riding on drag, so a light paper ball can be shoved around hard while still
 * having enough range to reach the top row.
 */
export function accelerationOf(
  ammo: AmmoId,
  vel: Vec2,
  spin: number,
  windX: number,
): Vec2 {
  const def = AMMO[ammo];
  const speed = Math.hypot(vel.x, vel.y);
  return {
    x: -def.drag * speed * vel.x + def.sail * windX + def.curve * spin,
    y: GRAVITY - def.drag * speed * vel.y,
  };
}

export function stepProjectile(
  projectile: Projectile,
  dt: number,
  windX: number,
): void {
  const acc = accelerationOf(projectile.ammo, projectile.vel, projectile.spin, windX);
  projectile.vel.x += acc.x * dt;
  projectile.vel.y += acc.y * dt;
  projectile.pos.x += projectile.vel.x * dt;
  projectile.pos.y += projectile.vel.y * dt;
}

export function powerFromDrag(dragLength: number): number {
  return Math.max(MIN_POWER, Math.min(1, dragLength / MAX_DRAG));
}

/** Initial velocity for an aim vector (launcher -> pointer) and a power 0..1. */
export function launchVelocity(aim: Vec2, power: number, ammo: AmmoId, swayRoll: number): Vec2 {
  const def = AMMO[ammo];
  const len = Math.hypot(aim.x, aim.y) || 1;
  const baseAngle = Math.atan2(aim.y, aim.x);
  const angle = baseAngle + (swayRoll * 2 - 1) * def.sway;
  const speed = def.speed * power;
  void len;
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

export function isOffStage(pos: Vec2): boolean {
  return pos.x < -6 || pos.x > STAGE_W + 6 || pos.y > STAGE_H + 8 || pos.y < -40;
}

export function circleHitsRect(pos: Vec2, radius: number, rect: Rect): boolean {
  const cx = Math.max(rect.x, Math.min(pos.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(pos.y, rect.y + rect.h));
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Dry-run the flight for the aim preview. Deliberately deterministic (no sway)
 * and truncated by the caller, so the player still has to read the wind.
 */
export function previewPath(
  ammo: AmmoId,
  aim: Vec2,
  power: number,
  windX: number,
  steps = 70,
  dt = 1 / 60,
): Vec2[] {
  const vel = launchVelocity(aim, power, ammo, 0.5);
  const probe: Projectile = {
    id: -1,
    ammo,
    pos: { ...LAUNCH },
    vel,
    spin: 0,
    bornAt: 0,
  };
  const path: Vec2[] = [];
  for (let i = 0; i < steps; i++) {
    stepProjectile(probe, dt, windX);
    if (isOffStage(probe.pos)) break;
    path.push({ ...probe.pos });
  }
  return path;
}

export { LAUNCH, MAX_DRAG };
