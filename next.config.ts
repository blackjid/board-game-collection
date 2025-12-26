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
  // Generate static output
  output: "export",
};

export default nextConfig;
