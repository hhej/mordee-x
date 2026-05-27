import type { NextConfig } from "next";

const tunnel = process.env.LOCAL_API_TUNNEL_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!tunnel) return [];
    // beforeFiles: the proxy must win over the local /api/* route handlers.
    // Those are filesystem routes, and a plain-array return is treated as
    // afterFiles (checked AFTER filesystem routes), so the handlers would match
    // first and the rewrite would never fire. On Vercel the real backend is the
    // laptop tunnel; the route handlers exist only so `pnpm dev` serves the API
    // locally for that tunnel to reach.
    return {
      beforeFiles: [{ source: "/api/:path*", destination: `${tunnel}/api/:path*` }],
    };
  },
};

export default nextConfig;
