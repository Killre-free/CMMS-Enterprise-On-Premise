const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  compress: true,
  productionBrowserSourceMaps: false,
  swcMinify: true,
  images: {
    unoptimized: true, // Enable if using external image optimization
    formats: ["image/avif", "image/webp"],
  },
  // Enable static generation
  staticPageGenerationTimeout: 120,
  // Headers for caching
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60" },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
