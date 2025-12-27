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
  // Instrumentation is enabled by default in Next.js 15+
};

export default nextConfig;
