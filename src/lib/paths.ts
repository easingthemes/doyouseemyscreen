/**
 * GitHub Pages serves the game from /<repo>/, so anything referenced by URL
 * rather than imported needs this prefix. Empty locally.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
