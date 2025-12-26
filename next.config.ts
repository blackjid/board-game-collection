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
  // Server mode for API routes (removed static export)
};

export default nextConfig;
