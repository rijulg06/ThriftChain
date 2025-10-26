import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Turbopack automatically handles WASM files in Next.js 16
  // Just ensure proper module resolution
  turbopack: {
    resolveAlias: {
      // Ensure walrus-wasm is properly resolved
    },
  },
};

export default nextConfig;
