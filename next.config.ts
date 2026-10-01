import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is pre-rendered, so the site ships as static files (out/)
  // served by Cloudflare Workers static assets. See wrangler.jsonc.
  output: "export",
  turbopack: { root: path.resolve(import.meta.dirname) },
  experimental: {
    // Next 16.3 caches Turbopack build artifacts in .next/cache/turbopack, and
    // Cloudflare Workers Builds restores .next/cache from earlier builds. A
    // restored pre-redesign cache made production compile a stale globals.css
    // (reproduced locally). Builds take seconds here, so always build cold.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
