import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: process.env.NEXT_PUBLIC_PRODUCTION_URL },
    { url: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/privacy-policy` },
    { url: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/terms-of-service` },
    { url: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/payment` },
    { url: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/search` },
    { url: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/support` },
    { url: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/track-order` },
  ]
}
