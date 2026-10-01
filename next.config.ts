import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is pre-rendered, so the site ships as static files (out/)
  // served by Cloudflare Workers static assets. See wrangler.jsonc.
  output: "export",
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
