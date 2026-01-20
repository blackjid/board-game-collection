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
  serverExternalPackages: ["playwright", "prisma", "@prisma/client"],

  // Instrumentation is enabled by default in Next.js 15+
};

export default nextConfig;
