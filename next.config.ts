import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.postimg.cc" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Necesario para que SameSite=none funcione en iframes
            // El frame-ancestors CSP se setea dinámicamente en middleware.ts
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
