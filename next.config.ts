import type { NextConfig } from "next";

const tunnel = process.env.LOCAL_API_TUNNEL_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!tunnel) return [];
    return [{ source: "/api/:path*", destination: `${tunnel}/api/:path*` }];
  },
};

export default nextConfig;
