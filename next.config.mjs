/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export keeps the whole game client-side, so Capacitor can later
  // wrap `out/` without needing a Node server.
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
