import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow BGG images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cf.geekdo-images.com",
        pathname: "/**",
      },
    ],
  },

  // Exclude heavy server-only packages from bundling
  // This significantly speeds up compilation by not processing these large packages
  serverExternalPackages: [
    "playwright",
    "prisma",
    "@prisma/client",
    "@prisma/adapter-libsql",
  ],

  // Skip ESLint during build (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during build (run tsc separately in CI)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Instrumentation is enabled by default in Next.js 15+
};

export default nextConfig;
