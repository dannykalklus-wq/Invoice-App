/** @type {import('next').NextConfig} */
console.log("📦 Loading Next.js config...");

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  webpack(config) {
    console.log("⚙️ Webpack config ready!");
    return config;
  },
};

export default nextConfig;
