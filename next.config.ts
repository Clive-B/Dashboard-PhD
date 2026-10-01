import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd()
  },
  experimental: {
    typedEnv: true
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [{
        key: "Content-Security-Policy",
        value: "frame-ancestors 'self' https://sites.google.com https://*.googleusercontent.com"
      }]
    }];
  }
};

export default nextConfig;
