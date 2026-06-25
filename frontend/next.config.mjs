/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: "../internal/web/frontend/out",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
