import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Response headers for every route (pages, /api, static files). The page CSP itself is per
// request, with a nonce, and lives in `src/proxy.ts` / `src/lib/csp.ts`; the enforced
// `Content-Security-Policy` here holds only directives that can't break Next's inline scripts.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), " +
      "magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
  },
];

// One year, this host only: sibling subdomains may still serve plain HTTP. Browsers ignore it
// over http://, so it is harmless on a local `next start`, but `next dev` never sends it.
const hsts = { key: "Strict-Transport-Security", value: "max-age=31536000" };

export default function config(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactCompiler: true,
    // `.next/standalone`: a minimal server.js plus only the traced node_modules (Dockerfile.prod).
    output: "standalone",
    poweredByHeader: false,
    images: {
      // Allowlist for the image optimizer (/_next/image). Only the brand mark in
      // public/ is rendered through next/image; anything else gets a 400. Add an
      // entry here when a new image source is introduced.
      localPatterns: [{ pathname: "/logo-mark.png", search: "" }],
      remotePatterns: [],
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: isDevServer ? securityHeaders : [...securityHeaders, hsts],
        },
        // The setup link carries a one-time token in its query string: send no Referer from it.
        // Its page also sets `referrer: "no-referrer"` (metadata); this covers the response too.
        {
          source: "/definir-senha",
          headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
        },
      ];
    },
  };
}
