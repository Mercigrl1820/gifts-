import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
