import type { NextConfig } from "next";

// Dominios de GHL desde donde se puede embeber el tracker como iframe
const GHL_FRAME_ORIGINS = [
  "https://*.myghl.com",
  "https://*.gohighlevel.com",
  "https://*.leadconnectorhq.com",
  "https://*.msgsndr.com",
].join(" ");

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
        // Aplica a todas las rutas de subdominios tenant
        source: "/:path*",
        headers: [
          {
            // Permite embeber solo desde GHL (no desde cualquier origen)
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${GHL_FRAME_ORIGINS}`,
          },
          {
            // Necesario para que SameSite=none funcione en iframes
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
