import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/terms-of-service", destination: "/terms", permanent: true },
      { source: "/tos", destination: "/terms", permanent: true },
    ];
  },
  eslint: {
    // Allows production builds to successfully complete even if
    // your project has ESLint errors. Useful while getting started.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allows production builds even with type errors (optional safety net)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
