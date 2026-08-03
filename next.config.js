/** @type {import('next').NextConfig} */
// VPS production: no basePath (https://planext4u.com/).
// GitHub Pages only: set GITHUB_PAGES=true (serves under /p4u).
const useGhPagesBase = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // Allow CI/verification builds to avoid a running development server's
  // locked `.next` directory while preserving `.next` as the default.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // output: 'export' removed — dynamic API-driven routes require server rendering
  basePath: useGhPagesBase ? '/p4u' : '',
  assetPrefix: useGhPagesBase ? '/p4u/' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep production builds reliable on constrained Windows hosts where
  // spawning several child processes can be blocked by the OS.
  experimental: {
    workerThreads: true,
    cpus: 1,
  },
  images: { unoptimized: true },
  async redirects() {
    return [{ source: "/app/vendor-register", destination: "/vendor-register", permanent: false }];
  },
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
