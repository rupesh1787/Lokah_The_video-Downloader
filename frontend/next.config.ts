import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images from video platforms
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
    ],
  },
};

export default nextConfig;
