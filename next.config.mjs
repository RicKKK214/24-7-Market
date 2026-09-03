/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { instrumentationHook: true },
  // Isolate build output per port so a second instance (e.g. a debug/negative-control
  // server) can never corrupt the primary dev server's route manifest.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: { remotePatterns: [{ protocol: 'https', hostname: 'warframe.market' }] },
};
export default nextConfig;
