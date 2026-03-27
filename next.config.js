/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

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
        hostname: "zvpzoumubcidrtkgxwqx.supabase.co",
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
    ],
  },
}

module.exports = nextConfig
