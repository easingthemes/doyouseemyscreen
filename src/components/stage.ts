import { STAGE_H, STAGE_W } from '@/engine/constants';

/** Stage units -> CSS pixels inside the fixed-size stage element. */
export const UNIT = 10;
export const STAGE_PX_W = STAGE_W * UNIT;
export const STAGE_PX_H = STAGE_H * UNIT;

export const u = (value: number) => value * UNIT;
