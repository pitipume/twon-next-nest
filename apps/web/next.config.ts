import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin images from Cloudflare R2 CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  // Turbopack is the default bundler in Next.js 16
  // Empty config = use defaults (canvas/encoding aliases not needed with react-pdf v9)
  turbopack: {},
};

export default nextConfig;
