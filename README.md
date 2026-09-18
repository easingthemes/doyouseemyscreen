# Do You See My Screen?

A business video call is on screen. You are throwing office supplies at it.

Every participant has a price tag — CEO 500, intern 10 — and the grid keeps
reordering itself while your paper ball is still in the air. Aiming at where
the CEO *is* misses. You have to aim at where the CEO *will be* once whoever is
talking now stops talking.

## The loop

- Drag anywhere over the meeting window to move the crosshair, release to throw.
  The roster, chat and score bar are not aim surfaces, so picking ammo never
  launches anything.
- A dotted preview shows the first half of the flight, and the projectile leaves
  a trail. Where it lands after that is on you.
- Hits score `value × ammo × modifiers`. Hitting someone mid-sentence doubles it,
  hitting a tiny filmstrip tile is worth 1.5×, and a camera-off tile pays half.
- Three hits and a participant leaves with "sorry, connection issues". Someone
  else always takes the empty seat.
- Better ammo drops during the meeting. The round is three minutes.

## Ballistics

A throw travels *into* the screen. It carries a depth coordinate `z`, and it is
tested against the tiles once, where it reaches the plane of the monitor. This
matters: in a flat side-on model the arc crosses the bottom row on its way up,
so every shot aimed high is intercepted by whoever sits low. With depth, a shot
aimed at the top row reaches the top row.

Integration is fixed-step at 60Hz:

```
a.x = -drag · |v| · v.x + sail · wind + curve · spin
a.y =  GRAVITY - drag · |v| · v.y
a.z = -drag · |v| · v.z
```

Wind uses a separate `sail` factor rather than riding on the drag term, so the
two stay independently tunable — a paper ball can be shoved half a tile
sideways by the AC while still having the range to reach the top row.

Muzzle speed is fixed per ammo, like the load in a hunting rifle. You aim at a
spot with the crosshair, and gravity and the draft decide where it really goes,
so every ammo has a hold-over you learn:

| Ammo | flight | aim above the top row | drift in a 10 u/s draft | score |
|---|---|---|---|---|
| A4 ball | 1.07s | 9.2 units | 6.4 units | ×1 |
| Post-it wad | 0.98s | 7.6 units | 4.4 units | ×1.3 |
| Banana peel | 0.91s | 6.4 units | 2.4 units | ×1.7 |
| Tomato | 0.82s | 5.2 units | 1.2 units | ×2.2 |
| Egg | 0.78s | 4.7 units | 0.7 units | ×2.6 |

The grid is 35 units tall, so paper needs most of a tile of hold-over and drifts
most of a tile in a strong draft, while an egg flies nearly where you point it.
Better ammo does not just score more — it is what makes the top row, where the
expensive people sit, reliably reachable.

Flight takes about a second, which is the point: the grid reorders while the
throw is still in the air.

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
src/data/        generated — the baked-in avatar file list
public/avatars/  drop face images here
```

The reorder animation lives in the engine, not in a UI animation library. That
is deliberate: collision detection then runs against the rect the player can
actually see, so a shot that looks like it lands on a sliding tile really does
land on it.

The simulation is seeded (mulberry32), so a round replays identically from its
seed — useful for balancing.

## Avatars

Drop images into `public/avatars/` and they become faces in the call. There is
no image for every participant at first, so anyone left over keeps the coloured
initials placeholder — and a camera-off tile always shows initials, image or
not. `public/avatars/README.md` covers formats and sizes.

A static export cannot scan a directory at runtime, so the file list is baked in
at build time by `scripts/generate-avatars.mjs`:

```bash
npm run avatars   # after adding images, so the dev server sees them
```

`npm run build` runs it automatically, so committing new images is enough for a
deploy. Faces are handed out without repeats while the pool lasts.

## Player name and progress

There is no backend and no auth. On first load the player types a display name,
which is kept in `localStorage` together with their progress — rounds played,
accuracy, best hit, and a best score per company. Anyone can type any name, and
clearing site data wipes everything.

The stored shapes (`src/lib/storage.ts`) are plain versioned JSON so they can be
POSTed to a real service later without a migration. Every read and write is
wrapped in try/catch: private browsing and blocked storage must not break play.

## Hosting

Pushing to the deploy branch publishes to GitHub Pages via
`.github/workflows/deploy.yml`: build, static export, upload, deploy. The
workflow sets `NEXT_PUBLIC_BASE_PATH` to the repo name, because Pages serves the
site from `/<repo>/`, and drops a `.nojekyll` file so `_next/` survives.

One manual step, once: in the repository settings, **Pages → Build and
deployment → Source → GitHub Actions**.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/
```

The build is a static export with no server, so a later Capacitor shell can wrap
`out/` directly. All coordinates are in virtual stage units (100 × 56.25) scaled
to the viewport, so physics behaves identically on a phone and a desktop.
