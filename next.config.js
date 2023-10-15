/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { domains: ["images.unsplash.com"] },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
