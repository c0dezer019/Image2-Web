import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The default remains the Node.js standalone build used by the Docker image.
  // `pnpm build:static` sets NEXT_OUTPUT=export and emits a deployable `out/`
  // directory instead.
  output: process.env.NEXT_OUTPUT === "export" ? "export" : "standalone",
  // Pin the workspace root. A stray ~/package-lock.json sits above this
  // project, so Turbopack otherwise infers the wrong root and writes an
  // empty/mismatched build manifest.
  turbopack: { root: __dirname },
};

export default nextConfig;
