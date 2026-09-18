# Avatars

Drop participant photos in this folder. Anything here is picked up as a face in
the call; participants with no image left to give fall back to their initials.

**Format**

- Square images. They are cropped to fill a 16:9 tile, so keep the face centred.
- 256×256 is plenty — tiles are small, and every image ships in the bundle.
- `.png`, `.jpg`, `.webp`, `.avif`, `.gif` or `.svg`.
- Name them anything; the filename is never shown.

**After adding files**

```bash
npm run avatars
```

That regenerates `src/data/avatars.ts`, which is the baked-in list the game
reads — a static export cannot scan a directory at runtime. `npm run build`
runs it automatically, so committing new images is enough for a deploy.

**Weight**

These are served as-is, with no image optimisation. Keep the total well under a
few MB or first load will suffer, especially on mobile.
