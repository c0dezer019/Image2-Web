import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Short commit SHA for this build, surfaced via lib/convert.ts's
    // CLIENT_VERSION. Vercel sets VERCEL_GIT_COMMIT_SHA automatically;
    // falls back to "dev" for local builds.
    NEXT_PUBLIC_APP_VERSION: (process.env.VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7),
  },
};

export default nextConfig;
