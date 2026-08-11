import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

/** Keep UI badges / changelog in lockstep with the published library package. */
const aiPkg = JSON.parse(
  readFileSync(join(__dirname, "../../packages/ai/package.json"), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_MONORCH_VERSION: aiPkg.version,
  },
  async redirects() {
    return [
      { source: "/docs/compare", destination: "/compare", permanent: true },
      { source: "/docs/changelog", destination: "/changelog", permanent: true },
      {
        source: "/docs/architecture",
        destination: "/architecture",
        permanent: true,
      },
      { source: "/docs/platforms", destination: "/platforms", permanent: true },
      { source: "/docs/security", destination: "/security", permanent: true },
    ];
  },
};

export default nextConfig;
