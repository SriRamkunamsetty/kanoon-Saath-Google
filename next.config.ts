import type { NextConfig } from "next";

/**
 * Kept intentionally small. Security headers live in `proxy.ts`
 * (edge layer — see README "Security model"), not here, so there is
 * exactly one place that owns them.
 */
const nextConfig: NextConfig = {
  // Fail the production build on type errors instead of shipping them.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Next.js 16 removed built-in build-time ESLint integration entirely
  // (there is no `eslint` key in its config type any more) — linting
  // is now solely the explicit `npm run lint` step, which both local
  // `npm run verify` and CI already run as its own gate before build.
  experimental: {
    // Uploaded documents are processed as text, not as multi-megabyte
    // binaries, but we cap the Server Action body size explicitly
    // rather than trusting the (larger) framework default.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
