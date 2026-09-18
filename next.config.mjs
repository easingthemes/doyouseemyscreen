/**
 * GitHub Pages serves the site from /<repo>/, so the asset paths need a base
 * path there and none locally. NEXT_PUBLIC_BASE_PATH is set by the deploy
 * workflow and left empty for `npm run dev`.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export keeps the whole game client-side, so Pages can host it as
  // plain files and Capacitor can later wrap `out/` without a Node server.
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
