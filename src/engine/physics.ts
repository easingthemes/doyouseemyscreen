import { AMMO, GRAVITY, LAUNCH, SCREEN_Z, STAGE_H, STAGE_W } from './constants';
import type { AmmoId, Projectile, Rect, Vec2, Vec3, Wind } from './types';

export function windAt(wind: Wind, t: number): number {
  return wind.base + wind.fanAmp * Math.sin(t * wind.fanFreq + wind.fanPhase) + wind.gust;
}

/**
 * Gravity pulls down, air resistance bleeds speed on every axis, the office
 * draft pushes sideways through a per-ammo `sail` factor, and spin curves the
 * things that curve. Wind is kept off the drag term so the two stay
 * independently tunable.
 */
export function accelerationOf(ammo: AmmoId, vel: Vec3, spin: number, windX: number): Vec3 {
  const def = AMMO[ammo];
  const speed = Math.hypot(vel.x, vel.y, vel.z);
  return {
    x: -def.drag * speed * vel.x + def.sail * windX + def.curve * spin,
    y: GRAVITY - def.drag * speed * vel.y,
    z: -def.drag * speed * vel.z,
  };
}

export function stepProjectile(projectile: Projectile, dt: number, windX: number): void {
  const acc = accelerationOf(projectile.ammo, projectile.vel, projectile.spin, windX);
  projectile.vel.x += acc.x * dt;
  projectile.vel.y += acc.y * dt;
  projectile.vel.z += acc.z * dt;
  projectile.pos.x += projectile.vel.x * dt;
  projectile.pos.y += projectile.vel.y * dt;
  projectile.pos.z += projectile.vel.z * dt;
}

/**
 * Point the throw at a spot on the screen. Muzzle speed is fixed per ammo, so
 * the drop and the wind drift are a property of what you picked up — the way a
 * hunting game makes you hold over for a slower round. Aim where you want it to
 * land and it will land low; learn the hold-over and it will not.
 */
export function launchVelocity(
  aim: Vec2,
  ammo: AmmoId,
  swayAngle = 0,
  swayAmount = 0,
): Vec3 {
  const def = AMMO[ammo];
  let dx = aim.x - LAUNCH.x;
  let dy = aim.y - LAUNCH.y;
  const reach = Math.hypot(dx, dy, SCREEN_Z);

  // Release error, as a cone around the aim line.
  const spread = def.sway * reach * swayAmount;
  dx += Math.cos(swayAngle * Math.PI * 2) * spread;
  dy += Math.sin(swayAngle * Math.PI * 2) * spread;

  const len = Math.hypot(dx, dy, SCREEN_Z) || 1;
  const scale = def.speed / len;
  return { x: dx * scale, y: dy * scale, z: SCREEN_Z * scale };
}

export function hasLanded(projectile: Projectile): boolean {
  return projectile.pos.z >= SCREEN_Z;
}

/** Fell short, flew wide, or dropped out of the room before reaching the wall. */
export function isOffStage(pos: Vec3): boolean {
  return (
    pos.x < -20 || pos.x > STAGE_W + 20 || pos.y > STAGE_H + 20 || pos.y < -60 || pos.z < -5
  );
}

export function circleHitsRect(pos: Vec3 | Vec2, radius: number, rect: Rect): boolean {
  const cx = Math.max(rect.x, Math.min(pos.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(pos.y, rect.y + rect.h));
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Dry-run the flight for the aim preview. Deterministic (no sway) and truncated
 * by the caller, so the player still has to read the drop and the draft.
 */
export function previewPath(ammo: AmmoId, aim: Vec2, windX: number, dt = 1 / 60): Vec3[] {
  const probe: Projectile = {
    id: -1,
    ammo,
    pos: { x: LAUNCH.x, y: LAUNCH.y, z: 0 },
    vel: launchVelocity(aim, ammo),
    spin: 0,
    bornAt: 0,
    trail: [],
  };
  const path: Vec3[] = [];
  for (let i = 0; i < 240; i++) {
    stepProjectile(probe, dt, windX);
    path.push({ ...probe.pos });
    if (hasLanded(probe) || isOffStage(probe.pos)) break;
  }
  return path;
}

export { LAUNCH, SCREEN_Z };
