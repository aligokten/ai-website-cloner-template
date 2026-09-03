import type { NextConfig } from "next";

/**
 * `GITHUB_PAGES=true` switches the build to a fully static export served from
 * a project subpath (https://<user>.github.io/<repo>/). Generation, exports and
 * the asset library all run in the browser, so the static build keeps every
 * feature — see src/lib/generate-client.ts for the API-less path.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = isPages
  ? {
      output: "export",
      // Tells the client there is no queue endpoint on this host, so it runs
      // generation in-browser without a failing request first.
      env: { NEXT_PUBLIC_STATIC_EXPORT: "true" },
      basePath,
      assetPrefix: basePath || undefined,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      output: "standalone",
    };

export default nextConfig;
