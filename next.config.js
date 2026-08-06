/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  turbopack: {},

  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: "memory",
      }
    }

    return config
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bzzhychzmepvozeosdkq.supabase.co",
        port: "",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
      },
    ],
  },
}

module.exports = nextConfig
