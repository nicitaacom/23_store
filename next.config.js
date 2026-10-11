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
    // Storage files use their provider CDN directly; overwrite URLs include a version query.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.jokik.fi",
        port: "",
        pathname: "/**",
      },
      ...(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? [{
        protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname,
        port: new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).port,
        pathname: `${new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).pathname.replace(/\/$/, "")}/**`,
      }] : []),
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
