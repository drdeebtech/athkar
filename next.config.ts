import path from "node:path";
import type { NextConfig } from "next";

if (
  process.argv.includes("build") &&
  !process.env.NEXT_PUBLIC_SITE_URL &&
  !process.env.VERCEL_PROJECT_PRODUCTION_URL
) {
  console.warn(
    "[athkar] NEXT_PUBLIC_SITE_URL is not set: canonical, Open Graph and sitemap URLs will point at localhost.",
  );
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
