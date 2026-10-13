import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Allowlist for the image optimizer (/_next/image). Only the brand mark in
    // public/ is rendered through next/image; anything else gets a 400. Add an
    // entry here when a new image source is introduced.
    localPatterns: [{ pathname: "/logo-mark.png", search: "" }],
    remotePatterns: [],
  },
};

export default nextConfig;
