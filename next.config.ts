import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/metadata",
      },
    ];
  },
};

export default nextConfig;
