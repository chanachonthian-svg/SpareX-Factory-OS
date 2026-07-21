/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,
  // three.js ships ESM that benefits from transpilation in the Next bundler
  transpilePackages: ["three"],
  // Type-checking (tsc) remains the build-time correctness gate; ESLint is run
  // separately via `npm run lint` so stylistic rules never block a deploy.
  eslint: { ignoreDuringBuilds: true },
  // SKIP_TYPECHECK=1 lets small servers (1GB EC2) build without the tsc pass
  // OOM-ing — tsc still gates locally before any deploy.
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1" },
};

export default nextConfig;
