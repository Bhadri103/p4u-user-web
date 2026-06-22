/** @type {import('next').NextConfig} */
// VPS production: no basePath (https://planext4u.com/).
// GitHub Pages only: set GITHUB_PAGES=true (serves under /p4u).
const useGhPagesBase = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // output: 'export' removed — dynamic API-driven routes require server rendering
  basePath: useGhPagesBase ? '/p4u' : '',
  assetPrefix: useGhPagesBase ? '/p4u/' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack(config) {
    config.module.rules.push({
      test: /\.(mp4|webm|ogg)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[hash][ext]',
      },
    });
    return config;
  },
};

module.exports = nextConfig;