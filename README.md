# Do You See My Screen?

A business video call is on screen. You are throwing office supplies at it.

Every participant has a price tag — CEO 500, intern 10 — and the grid keeps
reordering itself while your paper ball is still in the air. Aiming at where
the CEO *is* misses. You have to aim at where the CEO *will be* once whoever is
talking now stops talking.

## The loop

- Drag from your hand at the bottom of the screen. Direction aims, distance sets power.
- A dotted preview shows only the first part of the arc. The rest is on you.
- Hits score `value × ammo × modifiers`. Hitting someone mid-sentence doubles it,
  hitting a tiny filmstrip tile is worth 1.5×, and a camera-off tile pays half.
- Three hits and a participant leaves with "sorry, connection issues". Someone
  else always takes the empty seat.
- Better ammo drops during the meeting. The round is three minutes.

## Ballistics

Projectiles are integrated at a fixed 60Hz with gravity, quadratic air
resistance, an office draft, and spin for the things that curve:

```
a.x = -drag · |v| · v.x + sail · wind + curve · spin
a.y =  GRAVITY - drag · |v| · v.y
```

Wind uses a separate `sail` factor rather than riding on the drag term. That
keeps the two tunable independently — a paper ball can be shoved a full tile
sideways by the AC while still having the range to reach the top row.

| Ammo | flies | drifts in a 10 u/s draft | score |
|---|---|---|---|
| A4 ball | slow, heavy arc | ~11 units | ×1 |
| Post-it wad | slightly flatter | ~8 units | ×1.3 |
| Banana peel | curves sideways | ~5 units | ×1.7 |
| Tomato | fast, big splat | ~2.8 units | ×2.2 |
| Egg | fastest, straightest | ~2.7 units | ×2.6 |

The draft itself is an AC vent (steady, re-rolls every 9–18s), an oscillating
desk fan (a sine wave — learn its rhythm) and a gust every time someone opens a
door to join.

## Difficulty comes from the meeting

The meeting simulation *is* the difficulty curve. Nothing is a separate "level":

- Few participants → big tiles → easy.
- Enterprise all-hands → 20 tiny tiles, half of them camera-off.
- Someone shares a screen → faces collapse into a bottom filmstrip, targets get
  small, and every overshoot lands on the slide deck.

## Structure

```
src/engine/    framework-free simulation — no React, no DOM
  constants.ts   stage geometry, gravity, ammo table
  physics.ts     integration, launch, collision, aim preview
  layout.ts      grid packing, speaker ordering, tile easing
  game.ts        meeting sim, scoring, round state
  people.ts      company presets and participant generation
src/components/  rendering only
src/hooks/       the requestAnimationFrame loop
```

The reorder animation lives in the engine, not in a UI animation library. That
is deliberate: collision detection then runs against the rect the player can
actually see, so a shot that looks like it lands on a sliding tile really does
land on it.

The simulation is seeded (mulberry32), so a round replays identically from its
seed — useful for balancing.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/
```

The build is a static export with no server, so a later Capacitor shell can wrap
`out/` directly. All coordinates are in virtual stage units (100 × 56.25) scaled
to the viewport, so physics behaves identically on a phone and a desktop.
