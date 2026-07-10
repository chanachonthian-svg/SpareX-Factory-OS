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
};

export default nextConfig;
