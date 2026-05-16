import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
      },
      {
        protocol: "https",
        hostname: "obs.line-scdn.net",
      },
      {
        protocol: "https",
        hostname: "sprofile.line-scdn.net",
      },
      {
        // LINE は将来サブドメインを追加する可能性があるので包括的に許可
        protocol: "https",
        hostname: "**.line-scdn.net",
      },
      {
        protocol: "https",
        hostname: "xbzzknfscifuyuhmhuam.supabase.co",
      },
    ],
  },
};

export default nextConfig;
