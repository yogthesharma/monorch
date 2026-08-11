import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
