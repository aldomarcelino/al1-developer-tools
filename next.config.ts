import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/security/csp";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(undefined, process.env.NODE_ENV === "development"),
  },
];

const nextConfig: NextConfig = {
  // Production builds use webpack; development uses Turbopack, which requires
  // its supported default instead of webpack-only CSS chunking options.
  experimental: { cssChunking: process.env.NODE_ENV === "production" ? false : true },
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
