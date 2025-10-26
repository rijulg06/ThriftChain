/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for @mysten/sui BCS library in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
  // Disable Turbopack for now to fix BCS bundling issue
  experimental: {
    turbo: undefined,
  },
}

module.exports = nextConfig
